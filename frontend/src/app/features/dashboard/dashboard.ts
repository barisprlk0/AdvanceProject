import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
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

  stats = signal<DashboardStat[]>([]);
  recentOrders = signal<any[]>([]);
  topProducts = signal<any[]>([]);
  recentReviews = signal<Review[]>([]);
  shipments = signal<Shipment[]>([]);
  products = signal<Product[]>([]);
  orders = signal<Order[]>([]);
  reviews = signal<Review[]>([]);
  categories = signal<Category[]>([]);
  users = signal<User[]>([]);
  stores = signal<Store[]>([]);
  loading = signal(true);

  private revenueChart?: Chart;
  private categoryChart?: Chart;
  private chartsReady = false;

  readonly isIndividual = computed(() => this.auth.hasRole('INDIVIDUAL'));
  readonly isCorporate = computed(() => this.auth.hasRole('CORPORATE'));
  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));
  readonly isSellerView = computed(() => this.isCorporate() || this.isAdmin());

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    const name = this.auth.displayName();
    if (hour < 12) return `Günaydın, ${name}`;
    if (hour < 18) return `İyi günler, ${name}`;
    return `İyi akşamlar, ${name}`;
  });

  readonly subtitle = computed(() => {
    if (this.isIndividual()) return 'Alışverişlerin, kargoların ve yorumların tek yerde.';
    if (this.isCorporate()) return 'Mağazanızın sipariş, ürün ve yorum performansı.';
    return 'Platform genelindeki satış, kullanıcı ve katalog özeti.';
  });

  readonly deliveredShipments = computed(() => this.shipments().filter(s => this.normalizeStatus(s.status).includes('deliver')).length);
  readonly pendingShipments = computed(() => this.shipments().filter(s => !this.isFinalStatus(s.status)).length);
  readonly totalRevenue = computed(() => this.orders().reduce((sum, order) => sum + (Number(order.grandTotal) || 0), 0));
  readonly averageRating = computed(() => {
    const list = this.reviews();
    if (!list.length) return 0;
    return list.reduce((sum, review) => sum + (Number(review.starRating) || 0), 0) / list.length;
  });

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    this.renderCharts();
  }

  loadDashboardData(): void {
    this.loading.set(true);
    const includeAdminData = this.isAdmin();
    let pending = includeAdminData ? 7 : 5;
    const done = () => {
      pending -= 1;
      if (pending === 0) {
        this.buildDashboard();
        this.loading.set(false);
        setTimeout(() => this.renderCharts(), 0);
      }
    };

    this.api.getAll<Order>('orders').subscribe({ next: data => this.orders.set(data), error: () => { this.orders.set([]); done(); }, complete: done });
    this.api.getAll<Product>('products').subscribe({ next: data => this.products.set(data), error: () => { this.products.set([]); done(); }, complete: done });
    this.api.getAll<Review>('reviews').subscribe({ next: data => this.reviews.set(data), error: () => { this.reviews.set([]); done(); }, complete: done });
    this.api.getAll<Shipment>('shipments').subscribe({ next: data => this.shipments.set(data), error: () => { this.shipments.set([]); done(); }, complete: done });
    this.api.getAll<Category>('categories').subscribe({ next: data => this.categories.set(data), error: () => { this.categories.set([]); done(); }, complete: done });

    if (includeAdminData) {
      this.api.getAll<User>('users').subscribe({ next: data => this.users.set(data), error: () => { this.users.set([]); done(); }, complete: done });
      this.api.getAll<Store>('stores').subscribe({ next: data => this.stores.set(data), error: () => { this.stores.set([]); done(); }, complete: done });
    }
  }

  private buildDashboard(): void {
    this.recentOrders.set(this.orders()
      .slice()
      .sort((a, b) => new Date(b.orderDate || 0).getTime() - new Date(a.orderDate || 0).getTime())
      .slice(0, 6)
      .map(order => ({
        id: order.id,
        customer: order.user?.email?.split('@')[0] || 'Müşteri',
        amount: this.formatMoney(order.grandTotal),
        status: this.statusLabel(this.effectiveOrderStatus(order)),
        statusClass: this.statusClass(this.effectiveOrderStatus(order)),
        date: this.formatDate(order.orderDate),
        itemCount: order.items?.length || 0
      })));

    this.recentReviews.set(this.reviews().slice(0, 6));

    if (this.isIndividual()) {
      this.buildCustomerDashboard();
    } else if (this.isAdmin()) {
      this.buildAdminDashboard();
    } else {
      this.buildSellerDashboard();
    }
  }

  private buildAdminDashboard(): void {
    const orders = this.orders();
    const products = this.products();
    const reviews = this.reviews();
    const users = this.users();
    const stores = this.stores();
    const activeStores = stores.filter(store => this.normalizeStatus(store.status).includes('active')).length;
    const individualUsers = users.filter(user => this.normalizeStatus(user.roleType) === 'individual').length;
    const corporateUsers = users.filter(user => this.normalizeStatus(user.roleType) === 'corporate').length;

    this.stats.set([
      { label: 'Platform Geliri', value: this.formatMoney(this.totalRevenue()), hint: `${orders.length} sipariş`, icon: 'revenue' },
      { label: 'Kullanıcılar', value: users.length.toLocaleString('tr-TR'), hint: `${individualUsers} müşteri · ${corporateUsers} kurumsal`, icon: 'customers' },
      { label: 'Mağazalar', value: stores.length.toLocaleString('tr-TR'), hint: `${activeStores} aktif mağaza`, icon: 'products' },
      { label: 'Yorumlar', value: reviews.length.toLocaleString('tr-TR'), hint: `${this.averageRating().toFixed(1)} ortalama puan`, icon: 'review' }
    ]);

    const revenueByProduct = new Map<number, { count: number; revenue: number }>();
    orders.forEach(order => order.items?.forEach(item => {
      const id = item.product?.id;
      if (!id) return;
      const current = revenueByProduct.get(id) || { count: 0, revenue: 0 };
      current.count += Number(item.quantity) || 0;
      current.revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0);
      revenueByProduct.set(id, current);
    }));

    this.topProducts.set(products
      .map(product => {
        const metric = revenueByProduct.get(product.id) || { count: 0, revenue: 0 };
        return {
          id: product.id,
          name: product.name || product.description || `Ürün #${product.id}`,
          category: product.store?.name || product.category?.name || 'Katalog',
          metric: this.formatMoney(metric.revenue || product.unitPrice),
          detail: `${metric.count} satış`
        };
      })
      .sort((a, b) => (revenueByProduct.get(b.id)?.revenue || 0) - (revenueByProduct.get(a.id)?.revenue || 0))
      .slice(0, 5));
  }

  private buildCustomerDashboard(): void {
    const orders = this.orders();
    const reviews = this.reviews();
    const shipments = this.shipments();
    const spending = orders.reduce((sum, order) => sum + (Number(order.grandTotal) || 0), 0);

    this.stats.set([
      { label: 'Toplam Harcama', value: this.formatMoney(spending), hint: `${orders.length} siparişten`, icon: 'revenue' },
      { label: 'Siparişlerim', value: orders.length.toLocaleString('tr-TR'), hint: `${this.deliveredShipments()} teslim edildi`, icon: 'orders' },
      { label: 'Aktif Kargo', value: this.pendingShipments().toLocaleString('tr-TR'), hint: `${shipments.length} kargo kaydı`, icon: 'shipment' },
      { label: 'Yorumlarım', value: reviews.length.toLocaleString('tr-TR'), hint: `${this.averageRating().toFixed(1)} ortalama puan`, icon: 'review' }
    ]);

    this.topProducts.set(this.products().slice(0, 5).map(product => ({
      id: product.id,
      name: product.name || product.description || `Ürün #${product.id}`,
      category: product.category?.name || 'Kategori yok',
      metric: this.formatMoney(product.unitPrice),
      detail: product.store?.name || 'Mağaza yok'
    })));
  }

  private buildSellerDashboard(): void {
    const orders = this.orders();
    const products = this.products();
    const reviews = this.reviews();
    const customers = new Set(orders.map(order => order.user?.id).filter(Boolean)).size;

    this.stats.set([
      { label: this.isAdmin() ? 'Platform Geliri' : 'Mağaza Geliri', value: this.formatMoney(this.totalRevenue()), hint: `${orders.length} siparişten`, icon: 'revenue' },
      { label: 'Siparişler', value: orders.length.toLocaleString('tr-TR'), hint: `${this.deliveredShipments()} teslim edildi`, icon: 'orders' },
      { label: this.isAdmin() ? 'Müşteriler' : 'Müşteri Sayısı', value: customers.toLocaleString('tr-TR'), hint: 'tekil müşteri', icon: 'customers' },
      { label: 'Ürünler', value: products.length.toLocaleString('tr-TR'), hint: `${reviews.length} yorum`, icon: 'products' }
    ]);

    const soldByProduct = new Map<number, { count: number; revenue: number }>();
    orders.forEach(order => order.items?.forEach(item => {
      const id = item.product?.id;
      if (!id) return;
      const current = soldByProduct.get(id) || { count: 0, revenue: 0 };
      current.count += Number(item.quantity) || 0;
      current.revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0);
      soldByProduct.set(id, current);
    }));

    this.topProducts.set(products
      .map(product => {
        const sold = soldByProduct.get(product.id) || { count: 0, revenue: 0 };
        return {
          id: product.id,
          name: product.name || product.description || `Ürün #${product.id}`,
          category: product.category?.name || 'Kategori yok',
          metric: this.formatMoney(sold.revenue || product.unitPrice),
          detail: `${sold.count} satış`
        };
      })
      .sort((a, b) => Number((soldByProduct.get(b.id)?.count || 0) - (soldByProduct.get(a.id)?.count || 0)))
      .slice(0, 5));
  }

  effectiveOrderStatus(order: Order): string {
    const shipment = this.shipments().find(item => item.order?.id === order.id);
    return shipment?.status || order.status || 'Pending';
  }

  statusLabel(status: string | null | undefined): string {
    const s = this.normalizeStatus(status);
    if (s.includes('deliver') || s.includes('teslim')) return 'Teslim Edildi';
    if (s.includes('ship') || s.includes('transit') || s.includes('kargo')) return 'Kargoda';
    if (s.includes('process') || s.includes('hazır')) return 'Hazırlanıyor';
    if (s.includes('cancel') || s.includes('iptal')) return 'İptal';
    return 'Bekliyor';
  }

  statusClass(status: string | null | undefined): string {
    const s = this.normalizeStatus(status);
    if (s.includes('deliver') || s.includes('teslim')) return 'success';
    if (s.includes('ship') || s.includes('transit') || s.includes('kargo')) return 'warning';
    if (s.includes('process') || s.includes('hazır')) return 'primary';
    if (s.includes('cancel') || s.includes('iptal')) return 'danger';
    return 'secondary';
  }

  isFinalStatus(status: string | null | undefined): boolean {
    const s = this.normalizeStatus(status);
    return s.includes('deliver') || s.includes('cancel') || s.includes('teslim') || s.includes('iptal');
  }

  starText(rating: number | null | undefined): string {
    const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return '★'.repeat(value) + '☆'.repeat(5 - value);
  }

  productName(review: Review): string {
    return review.product?.name || review.product?.description || 'Ürün';
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

  private normalizeStatus(status: string | null | undefined): string {
    return (status || '').toLowerCase();
  }

  private renderCharts(): void {
    if (!this.chartsReady || !this.revenueCanvas || !this.categoryCanvas) return;
    this.revenueChart?.destroy();
    this.categoryChart?.destroy();
    this.revenueChart = new Chart(this.revenueCanvas.nativeElement, this.revenueChartConfig());
    this.categoryChart = new Chart(this.categoryCanvas.nativeElement, this.categoryChartConfig());
  }

  private revenueChartConfig(): ChartConfiguration<'line'> {
    const monthly = new Array(12).fill(0);
    this.orders().forEach(order => {
      if (!order.orderDate) return;
      monthly[new Date(order.orderDate).getMonth()] += Number(order.grandTotal) || 0;
    });

    return {
      type: 'line',
      data: {
        labels: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
        datasets: [{
          label: this.isIndividual() ? 'Harcama' : 'Gelir',
          data: monthly,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.08)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { border: { display: false }, ticks: { callback: value => `₺${Number(value) / 1000}K` } }
        }
      }
    };
  }

  private categoryChartConfig(): ChartConfiguration<'doughnut'> {
    const counts = new Map<string, number>();
    if (this.isIndividual()) {
      this.orders().forEach(order => order.items?.forEach(item => {
        const category = item.product?.category?.name || 'Diğer';
        counts.set(category, (counts.get(category) || 0) + (Number(item.quantity) || 1));
      }));
    } else {
      this.products().forEach(product => {
        const category = product.category?.name || 'Diğer';
        counts.set(category, (counts.get(category) || 0) + 1);
      });
    }

    const entries = Array.from(counts.entries()).slice(0, 6);
    const labels = entries.length ? entries.map(([label]) => label) : ['Veri yok'];
    const data = entries.length ? entries.map(([, value]) => value) : [1];

    return {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: ['#4f46e5', '#0891b2', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, boxWidth: 10, boxHeight: 10 }
          }
        }
      }
    };
  }
}
