import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Category, Order, Product, Review, Shipment, Store, User } from '../../core/models';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

type DashboardStat = {
  label: string;
  value: string;
  hint: string;
  icon: 'revenue' | 'orders' | 'customers' | 'products' | 'shipment' | 'review';
};

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('revenueChart') revenueCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryCanvas?: ElementRef<HTMLCanvasElement>;

  private revenueChart?: Chart;
  private categoryChart?: Chart;

  // --- Signals ---
  loading = signal(true);
  stats = signal<DashboardStat[]>([]);
  recentOrders = signal<any[]>([]);
  recentReviews = signal<Review[]>([]);
  topProducts = signal<any[]>([]);
  shipments = signal<Shipment[]>([]);

  isAdmin = computed(() => this.auth.userRole() === 'ADMIN');
  isCorporate = computed(() => this.auth.userRole() === 'CORPORATE');
  isIndividual = computed(() => this.auth.userRole() === 'INDIVIDUAL');

  greeting = computed(() => {
    const hour = new Date().getHours();
    const name = this.auth.user()?.email?.split('@')[0] || 'Kullanıcı';
    if (hour < 12) return `Günaydın, ${name}`;
    if (hour < 18) return `İyi günler, ${name}`;
    return `İyi akşamlar, ${name}`;
  });

  subtitle = computed(() => {
    if (this.isIndividual()) return 'Alışverişlerin, kargoların ve yorumların tek yerde.';
    if (this.isCorporate()) return 'Satışların, stokların ve mağaza performansın.';
    return 'Platform genelindeki satış, kullanıcı ve katalog özeti.';
  });

  chartsReady = false;

  constructor(public auth: AuthService, private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
  }

  loadDashboardData(): void {
    this.loading.set(true);
    
    let endpoint = 'analytics/individual';
    if (this.isAdmin()) endpoint = 'analytics/admin';
    else if (this.isCorporate()) endpoint = 'analytics/corporate';

    this.api.getSummary<any>(endpoint).subscribe({
      next: (data) => {
        console.log('Dashboard Data Received:', data);
        if (this.isAdmin()) {
          this.stats.set([
            { label: 'Platform Geliri', value: this.formatMoney(data.summary?.total_revenue), hint: `${data.summary?.order_count} sipariş`, icon: 'revenue' },
            { label: 'Kullanıcılar', value: data.platform?.user_count?.toLocaleString('tr-TR'), hint: 'toplam kayıt', icon: 'customers' },
            { label: 'Mağazalar', value: data.platform?.store_count?.toLocaleString('tr-TR'), hint: `${data.platform?.active_store_count} aktif`, icon: 'products' },
            { label: 'Yorumlar', value: data.platform?.review_count?.toLocaleString('tr-TR'), hint: `${data.platform?.average_rating?.toFixed(1)} ortalama`, icon: 'review' }
          ]);
          this.recentReviews.set(data.recentReviews || []);
          this.topProducts.set((data.topStores || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            category: 'Mağaza',
            metric: this.formatMoney(s.revenue),
            detail: `${s.order_count} sipariş`
          })));
        } else if (this.isCorporate()) {
          this.stats.set([
            { label: 'Mağaza Geliri', value: this.formatMoney(data.summary?.total_revenue), hint: `${data.summary?.order_count} sipariş`, icon: 'revenue' },
            { label: 'Ürün Sayısı', value: data.products?.total_products?.toLocaleString('tr-TR'), hint: `${data.products?.low_stock_count} düşük stok`, icon: 'products' }
          ]);
          this.recentOrders.set((data.recentOrders || []).map((o: any) => ({
            id: o.id,
            customer: o.customer_email?.split('@')[0],
            amount: this.formatMoney(o.grand_total),
            status: this.statusLabel(o.status),
            statusClass: this.statusClass(o.status),
            date: this.formatDate(o.order_date),
            itemCount: 1
          })));
        } else {
          this.stats.set([
            { 
              label: 'Toplam Harcama', 
              value: this.formatMoney(data.summary?.total_spent || 0), 
              hint: `${data.summary?.order_count || 0} sipariş`, 
              icon: 'revenue' 
            },
            { 
              label: 'Aktif Kargo', 
              value: (data.shipments?.active_shipments || 0).toLocaleString('tr-TR'), 
              hint: 'yolda olan', 
              icon: 'shipment' 
            }
          ]);
        }

        setTimeout(() => this.renderChartsWithData(data), 100);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Dashboard Data Error:', err);
        this.loading.set(false);
        const msg = err.error?.message || err.message || 'Bilinmeyen bir hata oluştu.';
        this.toast.error(`Dashboard verileri yüklenemedi: ${msg}`);
      }
    });

    // Also fetch recent orders via standard API for list if needed
    if (this.isIndividual() || this.isAdmin()) {
        this.api.getPage<Order>('orders', 0, 6).subscribe(res => {
            this.recentOrders.set(res.content.map(order => ({
              id: order.id,
              customer: order.user?.email?.split('@')[0] || 'Müşteri',
              amount: this.formatMoney(order.grandTotal),
              status: this.statusLabel(order.status),
              statusClass: this.statusClass(order.status),
              date: this.formatDate(order.orderDate),
              itemCount: order.items?.length || 1
            })));
        });
    }
  }

  private renderChartsWithData(data: any): void {
    if (!this.chartsReady || !this.revenueCanvas || !this.categoryCanvas) return;

    this.revenueChart?.destroy();
    this.categoryChart?.destroy();

    let labels: string[] = [];
    let values: number[] = [];
    
    if (this.isIndividual()) {
      labels = (data.monthlySpending || []).map((m: any) => `Ay ${m.month}`);
      values = (data.monthlySpending || []).map((m: any) => m.spent);
    } else {
      labels = (data.monthlyRevenue || []).map((m: any) => `Ay ${m.month}`);
      values = (data.monthlyRevenue || []).map((m: any) => m.revenue);
    }

    this.revenueChart = new Chart(this.revenueCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['-'],
        datasets: [{
          label: this.isIndividual() ? 'Harcama' : 'Gelir',
          data: values.length ? values : [0],
          borderColor: '#6366f1',
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(99, 102, 241, 0.1)'
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    let catLabels: string[] = [];
    let catValues: number[] = [];

    if (this.isAdmin()) {
      catLabels = (data.statusDistribution || []).map((s: any) => s.status);
      catValues = (data.statusDistribution || []).map((s: any) => s.count);
    } else if (this.isCorporate()) {
      catLabels = ['Ürünler', 'Stokta'];
      catValues = [data.products?.total_products || 0, (data.products?.total_products || 0) - (data.products?.low_stock_count || 0)];
    } else {
      catLabels = ['Tamamlanan', 'Aktif'];
      catValues = [data.summary?.order_count || 0, data.shipments?.active_shipments || 0];
    }

    this.categoryChart = new Chart(this.categoryCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: catLabels.length ? catLabels : ['Veri yok'],
        datasets: [{
          data: catValues.length ? catValues : [1],
          backgroundColor: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });
  }

  statusLabel(status: string | null | undefined): string {
    const s = (status || '').toLowerCase();
    if (s.includes('deliver') || s.includes('teslim')) return 'Teslim Edildi';
    if (s.includes('ship') || s.includes('transit') || s.includes('kargo')) return 'Kargoda';
    if (s.includes('process') || s.includes('hazır')) return 'Hazırlanıyor';
    if (s.includes('cancel') || s.includes('iptal')) return 'İptal';
    return 'Bekliyor';
  }

  statusClass(status: string | null | undefined): string {
    const s = (status || '').toLowerCase();
    if (s.includes('deliver') || s.includes('teslim')) return 'success';
    if (s.includes('ship') || s.includes('transit') || s.includes('kargo')) return 'warning';
    if (s.includes('process') || s.includes('hazır')) return 'primary';
    if (s.includes('cancel') || s.includes('iptal')) return 'danger';
    return 'secondary';
  }

  starText(rating: number | null | undefined): string {
    const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return '★'.repeat(value) + '☆'.repeat(5 - value);
  }

  productName(review: Review): string {
    return review.product?.name || 'Ürün';
  }

  userName(review: Review): string {
    return review.user?.email?.split('@')[0] || 'Müşteri';
  }

  formatMoney(value: number | null | undefined): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(value) || 0);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
  }
}
