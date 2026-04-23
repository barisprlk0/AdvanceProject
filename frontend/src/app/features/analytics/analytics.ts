import { Component, signal, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Order, Product, Review } from '../../core/models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.html',
  styleUrl: './analytics.css'
})
export class AnalyticsComponent implements OnInit, AfterViewInit {
  @ViewChild('salesChart') salesCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ordersChart') ordersCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('revenueExpenseChart') revenueExpenseCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('segmentChart') segmentCanvas!: ElementRef<HTMLCanvasElement>;

  loading = signal(true);
  kpis = signal([
    { label: 'Toplam Satış', value: '—', change: '', positive: true },
    { label: 'Ortalama Sipariş', value: '—', change: '', positive: true },
    { label: 'Dönüşüm Oranı', value: '—', change: '', positive: true },
    { label: 'Müşteri Memnuniyeti', value: '—', change: '', positive: true },
  ]);

  private orders: Order[] = [];
  private products: Product[] = [];
  private reviews: Review[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    // Load data in parallel
    this.api.getAll<Order>('orders').subscribe(data => {
      this.orders = data;
      this.updateKpis();
      setTimeout(() => this.initCharts(), 200);
    });
    this.api.getAll<Product>('products').subscribe(data => { this.products = data; });
    this.api.getAll<Review>('reviews').subscribe(data => {
      this.reviews = data;
      this.updateKpis();
    });
  }

  ngAfterViewInit(): void {}

  private updateKpis(): void {
    const totalRevenue = this.orders.reduce((s, o) => s + (o.grandTotal || 0), 0);
    const avgOrder = this.orders.length > 0 ? totalRevenue / this.orders.length : 0;
    const avgRating = this.reviews.length > 0 ? this.reviews.reduce((s, r) => s + (r.starRating || 0), 0) / this.reviews.length : 0;

    this.kpis.set([
      { label: 'Toplam Satış', value: `₺${totalRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`, change: `${this.orders.length} siparişten`, positive: true },
      { label: 'Ortalama Sipariş', value: `₺${avgOrder.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, change: '', positive: true },
      { label: 'Dönüşüm Oranı', value: `%${(3.8).toFixed(1)}`, change: '', positive: true },
      { label: 'Müşteri Memnuniyeti', value: `${avgRating.toFixed(1)} / 5.0`, change: `${this.reviews.length} değerlendirme`, positive: avgRating >= 3.5 },
    ]);
    this.loading.set(false);
  }

  private initCharts(): void {
    this.initSalesChart();
    this.initOrdersChart();
    this.initRevenueExpenseChart();
    this.initSegmentChart();
  }

  private initSalesChart(): void {
    if (!this.salesCanvas) return;
    const ctx = this.salesCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const dayRevenue = new Array(7).fill(0);
    this.orders.forEach(o => {
      if (o.orderDate) {
        const dow = new Date(o.orderDate).getDay();
        const mapped = dow === 0 ? 6 : dow - 1;
        dayRevenue[mapped] += (o.grandTotal || 0);
      }
    });

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(79,70,229,0.12)');
    gradient.addColorStop(1, 'rgba(79,70,229,0)');

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          data: dayRevenue,
          borderColor: '#4f46e5', backgroundColor: gradient, fill: true,
          tension: 0.4, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5,
          pointHoverBackgroundColor: '#4f46e5'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', padding: 10, cornerRadius: 8, titleFont: { family: 'Inter' }, bodyFont: { family: 'Inter' }, callbacks: { label: (c) => `₺${(c.parsed.y ?? 0).toLocaleString('tr-TR')}` } } },
        scales: { x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8' }, border: { display: false } }, y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8', callback: (v) => `₺${Number(v)/1000}K` }, border: { display: false } } },
        interaction: { intersect: false, mode: 'index' }
      }
    });
  }

  private initOrdersChart(): void {
    if (!this.ordersCanvas) return;
    const ctx = this.ordersCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const dayCounts = new Array(7).fill(0);
    this.orders.forEach(o => {
      if (o.orderDate) {
        const dow = new Date(o.orderDate).getDay();
        const mapped = dow === 0 ? 6 : dow - 1;
        dayCounts[mapped]++;
      }
    });

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          data: dayCounts,
          backgroundColor: '#4f46e5',
          borderRadius: 6, barPercentage: 0.6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8' }, border: { display: false } }, y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8' }, border: { display: false } } }
      }
    });
  }

  private initRevenueExpenseChart(): void {
    if (!this.revenueExpenseCanvas) return;
    const ctx = this.revenueExpenseCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const revenue = new Array(12).fill(0);
    this.orders.forEach(o => {
      if (o.orderDate) {
        const m = new Date(o.orderDate).getMonth();
        revenue[m] += (o.grandTotal || 0);
      }
    });
    const expenses = revenue.map(r => r * 0.65);

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { label: 'Gelir', data: revenue, backgroundColor: '#4f46e5', borderRadius: 4, barPercentage: 0.5 },
          { label: 'Gider', data: expenses, backgroundColor: '#cbd5e1', borderRadius: 4, barPercentage: 0.5 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 12, boxHeight: 12, padding: 16, font: { family: 'Inter', size: 11 }, color: '#64748b', usePointStyle: true, pointStyle: 'circle' } }, tooltip: { backgroundColor: '#0f172a', padding: 10, cornerRadius: 8, callbacks: { label: (c) => ` ${c.dataset.label}: ₺${(c.parsed.y ?? 0).toLocaleString('tr-TR')}` } } },
        scales: { x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8' }, border: { display: false } }, y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8', callback: (v) => `₺${Number(v)/1000}K` }, border: { display: false } } }
      }
    });
  }

  private initSegmentChart(): void {
    if (!this.segmentCanvas) return;
    const ctx = this.segmentCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Segment from review sentiments
    const positive = this.reviews.filter(r => r.sentiment?.toLowerCase().includes('positive')).length;
    const negative = this.reviews.filter(r => r.sentiment?.toLowerCase().includes('negative')).length;
    const neutral = this.reviews.length - positive - negative;

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Olumlu', 'Nötr', 'Olumsuz'],
        datasets: [{ data: [positive || 1, neutral || 1, negative || 1], backgroundColor: ['#4f46e5', '#f59e0b', '#0891b2'], borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '72%',
        plugins: { legend: { display: true, position: 'bottom', labels: { padding: 16, boxWidth: 10, boxHeight: 10, font: { family: 'Inter', size: 11 }, color: '#64748b', usePointStyle: true, pointStyle: 'circle' } } }
      }
    });
  }
}
