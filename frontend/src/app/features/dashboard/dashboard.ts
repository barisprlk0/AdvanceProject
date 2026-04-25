import { Component, signal, computed, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { Product, Order, Review, Category } from '../../core/models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('revenueChart') revenueCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(public auth: AuthService, private api: ApiService) {}

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    const name = this.auth.displayName();
    if (hour < 12) return `Günaydın, ${name}`;
    if (hour < 18) return `İyi günler, ${name}`;
    return `İyi akşamlar, ${name}`;
  });

  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));
  readonly isCorporate = computed(() => this.auth.hasAnyRole('ADMIN', 'CORPORATE'));

  stats = signal([
    { label: 'Toplam Gelir', value: '—', change: '', positive: true, icon: 'revenue' },
    { label: 'Siparişler', value: '—', change: '', positive: true, icon: 'orders' },
    { label: 'Müşteriler', value: '—', change: '', positive: true, icon: 'customers' },
    { label: 'Ürünler', value: '—', change: '', positive: true, icon: 'products' },
  ]);

  recentOrders = signal<any[]>([]);
  topProducts = signal<any[]>([]);
  activities = signal<any[]>([]);

  // Store raw data for chart rendering
  private orders: Order[] = [];
  private categories: Category[] = [];

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Charts will be initialized after data loads
  }

  private loadDashboardData(): void {
    // Load all data in parallel
    this.api.getAll<Product>('products').subscribe(products => {
      this.stats.update(s => {
        const copy = [...s];
        copy[3] = { ...copy[3], value: products.length.toLocaleString('tr-TR'), change: `${products.length} kayıtlı`, positive: true };
        return copy;
      });
    });

    this.api.getAll<Order>('orders').subscribe(orders => {
      this.orders = orders;

      // Stats: total revenue & order count
      const totalRevenue = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
      this.stats.update(s => {
        const copy = [...s];
        copy[0] = { ...copy[0], value: `₺${totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`, change: `${orders.length} siparişten`, positive: true };
        copy[1] = { ...copy[1], value: orders.length.toLocaleString('tr-TR'), change: 'toplam sipariş', positive: true };
        return copy;
      });

      // Recent orders (last 6)
      const sorted = [...orders].sort((a, b) => new Date(b.orderDate || 0).getTime() - new Date(a.orderDate || 0).getTime());
      this.recentOrders.set(sorted.slice(0, 6).map(o => ({
        id: `ORD-${o.id}`,
        customer: o.user?.email?.split('@')[0] || `Müşteri #${o.user?.id || '?'}`,
        amount: `₺${(o.grandTotal || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
        status: this.mapStatus(o.status),
        statusClass: this.mapStatusClass(o.status),
        date: o.orderDate ? new Date(o.orderDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
      })));

      // Activities from recent orders
      this.activities.set(sorted.slice(0, 5).map(o => ({
        text: `Sipariş ${o.status?.toLowerCase() || 'oluşturuldu'}`,
        detail: `ORD-${o.id} · ₺${(o.grandTotal || 0).toLocaleString('tr-TR')}`,
        time: o.orderDate ? this.timeAgo(new Date(o.orderDate)) : '—',
        type: 'order'
      })));

      // Init charts after data loads
      setTimeout(() => this.initRevenueChart(), 100);
    });

    if (this.isAdmin()) {
      this.api.getAll<any>('users').subscribe(users => {
        const customerCount = users.filter((u: any) => u.roleType?.toLowerCase() !== 'admin').length;
        this.stats.update(s => {
          const copy = [...s];
          copy[2] = { ...copy[2], value: customerCount.toLocaleString('tr-TR'), change: `${users.length} toplam kullanıcı`, positive: true };
          return copy;
        });
      });
    } else {
      this.stats.update(s => {
        const copy = [...s];
        copy[2] = { ...copy[2], value: 'N/A', change: 'Erişim yetkisi yok', positive: false };
        return copy;
      });
    }

    this.api.getAll<Category>('categories').subscribe(cats => {
      this.categories = cats;
      setTimeout(() => this.initCategoryChart(), 200);
    });

    // Top products
    this.api.getAll<Product>('products').subscribe(products => {
      this.topProducts.set(products.slice(0, 5).map(p => ({
        name: p.name || p.description || `Ürün #${p.id}`,
        category: p.category?.name || '—',
        sold: '—',
        revenue: `₺${(p.unitPrice || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
        trend: ''
      })));
    });
  }

  private mapStatus(status: string | null | undefined): string {
    const s = status?.toLowerCase() || '';
    if (s.includes('deliver') || s.includes('teslim')) return 'Teslim Edildi';
    if (s.includes('ship') || s.includes('kargo')) return 'Kargoda';
    if (s.includes('process') || s.includes('hazır')) return 'Hazırlanıyor';
    if (s.includes('cancel') || s.includes('iptal')) return 'İptal';
    if (s.includes('pending') || s.includes('bekl')) return 'Bekleyen';
    return status || 'Bekleyen';
  }

  private mapStatusClass(status: string | null | undefined): string {
    const s = status?.toLowerCase() || '';
    if (s.includes('deliver') || s.includes('teslim')) return 'success';
    if (s.includes('ship') || s.includes('kargo')) return 'warning';
    if (s.includes('process') || s.includes('hazır')) return 'primary';
    if (s.includes('cancel') || s.includes('iptal')) return 'danger';
    return 'secondary';
  }

  private timeAgo(date: Date): string {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} saat önce`;
    return `${Math.floor(hours / 24)} gün önce`;
  }

  private initRevenueChart(): void {
    if (!this.revenueCanvas) return;
    const ctx = this.revenueCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Group orders by month
    const monthlyRevenue = new Array(12).fill(0);
    this.orders.forEach(o => {
      if (o.orderDate) {
        const month = new Date(o.orderDate).getMonth();
        monthlyRevenue[month] += (o.grandTotal || 0);
      }
    });

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.15)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0)');

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
        datasets: [{
          label: 'Gelir',
          data: monthlyRevenue,
          borderColor: '#4f46e5',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#4f46e5',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { family: 'Inter', size: 12 },
            bodyFont: { family: 'Inter', size: 13 },
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (ctx) => `₺${(ctx.parsed.y ?? 0).toLocaleString('tr-TR')}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8' }, border: { display: false } },
          y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8', callback: (val) => `₺${Number(val) / 1000}K` }, border: { display: false } }
        },
        interaction: { intersect: false, mode: 'index' }
      }
    });
  }

  private initCategoryChart(): void {
    if (!this.categoryCanvas) return;
    const ctx = this.categoryCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const colors = ['#4f46e5', '#0891b2', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#f97316', '#06b6d4'];
    const labels = this.categories.map(c => c.name || `Kat #${c.id}`);
    const data = this.categories.map((_, i) => Math.max(1, Math.round(100 / this.categories.length) + (i % 3) * 5));

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              padding: 16, boxWidth: 10, boxHeight: 10,
              font: { family: 'Inter', size: 11 }, color: '#64748b',
              usePointStyle: true, pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 12,
            cornerRadius: 8,
            callbacks: { label: (ctx) => ` ${ctx.label}: %${ctx.parsed}` }
          }
        }
      }
    });
  }
}
