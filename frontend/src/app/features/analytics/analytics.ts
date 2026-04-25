import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ApiService } from '../../core/services/api.service';

Chart.register(...registerables);

type Kpi = { label: string; value: string; detail: string; tone: 'primary' | 'success' | 'warning' | 'danger' };

@Component({
  selector: 'app-analytics',
  imports: [RouterLink],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css'
})
export class AnalyticsComponent implements OnInit, AfterViewInit {
  @ViewChild('revenueChart') revenueCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChart') statusCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('roleChart') roleCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('ratingChart') ratingCanvas?: ElementRef<HTMLCanvasElement>;

  loading = signal(true);
  kpis = signal<Kpi[]>([]);
  topStores = signal<any[]>([]);
  categoryRows = signal<any[]>([]);
  recentReviews = signal<any[]>([]);
  orderStatusRows = signal<any[]>([]);

  private monthlyRevenue: any[] = [];
  private statusDistribution: any[] = [];
  private roleDistribution: any[] = [];
  private ratingDistribution: any[] = [];
  private chartsReady = false;
  private charts: Chart[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    this.renderCharts();
  }

  loadData(): void {
    this.loading.set(true);
    this.api.getById<any>('analytics', 'admin').subscribe({
      next: (data) => {
        this.buildAnalytics(data);
        this.loading.set(false);
        setTimeout(() => this.renderCharts(), 0);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  private buildAnalytics(data: any): void {
    const summary = data.summary || {};
    const completionData = data.completion || {};
    const platform = data.platform || {};
    const revenue = this.num(summary.total_revenue);
    const orderCount = this.num(summary.order_count);
    const avgOrder = this.num(summary.average_order);
    const delivered = this.num(completionData.delivered_orders);
    const completion = orderCount ? (delivered / orderCount) * 100 : 0;
    const avgRating = this.num(platform.average_rating);
    const reviewCount = this.num(platform.review_count);
    const activeStores = this.num(platform.active_store_count);
    const storeCount = this.num(platform.store_count);

    this.monthlyRevenue = data.monthlyRevenue || [];
    this.statusDistribution = data.statusDistribution || [];
    this.roleDistribution = data.roleDistribution || [];
    this.ratingDistribution = data.ratingDistribution || [];

    this.kpis.set([
      { label: 'Toplam Gelir', value: this.money(revenue), detail: `${orderCount.toLocaleString('tr-TR')} sipariş`, tone: 'primary' },
      { label: 'Ortalama Sipariş', value: this.money(avgOrder), detail: 'sipariş başına gelir', tone: 'success' },
      { label: 'Tamamlanma', value: `%${completion.toFixed(1)}`, detail: `${delivered.toLocaleString('tr-TR')} teslim edilen`, tone: completion >= 60 ? 'success' : 'warning' },
      { label: 'Platform Kapsamı', value: this.num(platform.user_count).toLocaleString('tr-TR'), detail: `${activeStores}/${storeCount} aktif mağaza`, tone: 'primary' },
      { label: 'Katalog', value: this.num(platform.product_count).toLocaleString('tr-TR'), detail: `${this.num(platform.category_count)} kategori`, tone: 'warning' },
      { label: 'Memnuniyet', value: `${avgRating.toFixed(1)} / 5`, detail: `${reviewCount.toLocaleString('tr-TR')} yorum`, tone: avgRating >= 3.5 ? 'success' : 'danger' }
    ]);

    this.topStores.set((data.topStores || []).map((row: any) => ({
      id: row.id,
      name: row.name || `Mağaza #${row.id}`,
      owner: row.owner_email || '-',
      status: row.status || '-',
      products: this.num(row.product_count),
      orders: this.num(row.order_count),
      revenue: this.money(this.num(row.revenue))
    })));

    this.categoryRows.set((data.categoryPerformance || []).map((row: any) => ({
      name: row.name || 'Diğer',
      products: this.num(row.product_count),
      orders: this.num(row.sold_count),
      revenue: this.money(this.num(row.revenue))
    })));

    this.recentReviews.set(data.recentReviews || []);
    this.orderStatusRows.set(this.buildStatusRows());
  }

  private buildStoreRows(): any[] {
    return [];
    /* return this.stores.map(store => {
      const storeOrders = this.orders.filter(order => order.store?.id === store.id);
      const revenue = storeOrders.reduce((sum, order) => sum + (Number(order.grandTotal) || 0), 0);
      const products = this.products.filter(product => product.store?.id === store.id).length;
      return {
        id: store.id,
        name: store.name || `Mağaza #${store.id}`,
        owner: store.owner?.email || '-',
        status: store.status || '-',
        products,
        orders: storeOrders.length,
        revenue: this.money(revenue)
      };
    }).sort((a, b) => this.parseMoney(b.revenue) - this.parseMoney(a.revenue)).slice(0, 6); */
  }

  private buildCategoryRows(): any[] {
    return [];
    /* const rows = new Map<string, { products: number; revenue: number; orders: number }>();
    this.products.forEach(product => {
      const name = product.category?.name || 'Diğer';
      const row = rows.get(name) || { products: 0, revenue: 0, orders: 0 };
      row.products += 1;
      rows.set(name, row);
    });

    this.orders.forEach(order => order.items?.forEach(item => {
      const name = item.product?.category?.name || 'Diğer';
      const row = rows.get(name) || { products: 0, revenue: 0, orders: 0 };
      row.orders += Number(item.quantity) || 1;
      row.revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0);
      rows.set(name, row);
    }));

    return Array.from(rows.entries()).map(([name, row]) => ({
      name,
      products: row.products,
      orders: row.orders,
      revenue: this.money(row.revenue)
    })).sort((a, b) => this.parseMoney(b.revenue) - this.parseMoney(a.revenue)).slice(0, 6); */
  }

  private buildStatusRows(): any[] {
    const total = this.statusDistribution.reduce((sum, row) => sum + this.num(row.count), 0);
    const statuses = ['delivered', 'shipped', 'processing', 'pending', 'cancelled'];
    return statuses.map(status => {
      const count = this.num(this.statusDistribution.find(row => row.status === status)?.count);
      return {
        label: this.statusLabel(status),
        count,
        percent: total ? Math.round((count / total) * 100) : 0,
        className: this.statusClass(status)
      };
    });
  }

  productName(review: any): string {
    return review.product_name || review.product?.name || review.product?.description || 'Ürün';
  }

  userName(review: any): string {
    return (review.user_email || review.user?.email)?.split('@')[0] || 'Müşteri';
  }

  stars(value: number | null | undefined): string {
    const rating = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  reviewRating(review: any): number {
    return this.num(review.star_rating ?? review.starRating);
  }

  statusLabel(status: string | null | undefined): string {
    const s = this.normalize(status);
    if (s.includes('deliver')) return 'Teslim Edildi';
    if (s.includes('ship') || s.includes('transit')) return 'Kargoda';
    if (s.includes('process')) return 'Hazırlanıyor';
    if (s.includes('cancel')) return 'İptal';
    return 'Bekliyor';
  }

  statusClass(status: string | null | undefined): string {
    const s = this.normalize(status);
    if (s.includes('deliver')) return 'success';
    if (s.includes('ship') || s.includes('transit')) return 'warning';
    if (s.includes('process')) return 'primary';
    if (s.includes('cancel')) return 'danger';
    return 'secondary';
  }

  private renderCharts(): void {
    if (!this.chartsReady) return;
    this.charts.forEach(chart => chart.destroy());
    this.charts = [];

    if (this.revenueCanvas) this.charts.push(new Chart(this.revenueCanvas.nativeElement, this.revenueChartConfig()));
    if (this.statusCanvas) this.charts.push(new Chart(this.statusCanvas.nativeElement, this.statusChartConfig()));
    if (this.roleCanvas) this.charts.push(new Chart(this.roleCanvas.nativeElement, this.roleChartConfig()));
    if (this.ratingCanvas) this.charts.push(new Chart(this.ratingCanvas.nativeElement, this.ratingChartConfig()));
  }

  private revenueChartConfig(): ChartConfiguration<'bar'> {
    const monthly = new Array(12).fill(0);
    const completed = new Array(12).fill(0);
    this.monthlyRevenue.forEach(row => {
      const month = this.num(row.month) - 1;
      if (month < 0 || month > 11) return;
      monthly[month] = this.num(row.revenue);
      completed[month] = this.num(row.delivered_revenue);
    });

    return {
      type: 'bar',
      data: {
        labels: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
        datasets: [
          { label: 'Gelir', data: monthly, backgroundColor: '#4f46e5', borderRadius: 5 },
          { label: 'Teslim Edilen', data: completed, backgroundColor: '#10b981', borderRadius: 5 }
        ]
      },
      options: this.basicChartOptions()
    };
  }

  private statusChartConfig(): ChartConfiguration<'doughnut'> {
    const rows = this.orderStatusRows();
    return {
      type: 'doughnut',
      data: {
        labels: rows.map(row => row.label),
        datasets: [{ data: rows.map(row => row.count || 0), backgroundColor: ['#10b981', '#f59e0b', '#4f46e5', '#94a3b8', '#ef4444'], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' } } }
    };
  }

  private roleChartConfig(): ChartConfiguration<'doughnut'> {
    const admin = this.num(this.roleDistribution.find(row => this.normalize(row.role) === 'admin')?.count);
    const corporate = this.num(this.roleDistribution.find(row => this.normalize(row.role) === 'corporate')?.count);
    const individual = this.num(this.roleDistribution.find(row => this.normalize(row.role) === 'individual')?.count);
    return {
      type: 'doughnut',
      data: {
        labels: ['Admin', 'Kurumsal', 'Müşteri'],
        datasets: [{ data: [admin, corporate, individual], backgroundColor: ['#111827', '#4f46e5', '#0891b2'], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' } } }
    };
  }

  private ratingChartConfig(): ChartConfiguration<'bar'> {
    const ratings = [1, 2, 3, 4, 5].map(star => this.num(this.ratingDistribution.find(row => this.num(row.rating) === star)?.count));
    return {
      type: 'bar',
      data: {
        labels: ['1★', '2★', '3★', '4★', '5★'],
        datasets: [{ label: 'Yorum', data: ratings, backgroundColor: '#f59e0b', borderRadius: 5 }]
      },
      options: this.basicChartOptions()
    };
  }

  private basicChartOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top', align: 'end' } },
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: { border: { display: false }, ticks: { precision: 0 } }
      }
    };
  }

  private money(value: number | null | undefined): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(value) || 0);
  }

  private num(value: unknown): number {
    return Number(value) || 0;
  }

  private normalize(value: string | null | undefined): string {
    return (value || '').toLowerCase();
  }
}
