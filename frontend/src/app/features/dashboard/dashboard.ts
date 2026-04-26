import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Order, OrderItem, Review, Shipment } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

Chart.register(...registerables);

type DashboardStat = {
  label: string;
  value: string;
  hint: string;
  icon: 'revenue' | 'orders' | 'customers' | 'products' | 'shipment' | 'review';
};

type QuickAction = {
  label: string;
  link: string;
  tone: 'primary' | 'secondary' | 'ghost';
};

type FocusCard = {
  title: string;
  value: string;
  detail: string;
};

type DashboardOrderRow = {
  id: number;
  customer: string;
  amount: string;
  status: string;
  statusClass: string;
  date: string;
  itemCount: number;
};

type DashboardProductRow = {
  id: number;
  name: string;
  category: string;
  metric: string;
  detail: string;
};

type WidgetKey = 'stats' | 'focus' | 'actions' | 'charts' | 'mainTable' | 'sidePanel' | 'reviews';
type WidgetVisibility = Record<WidgetKey, boolean>;

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('revenueChart') revenueCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryCanvas?: ElementRef<HTMLCanvasElement>;

  private revenueChart?: Chart;
  private categoryChart?: Chart;

  loading = signal(true);
  stats = signal<DashboardStat[]>([]);
  focusCards = signal<FocusCard[]>([]);
  quickActions = signal<QuickAction[]>([]);

  recentOrders = signal<DashboardOrderRow[]>([]);
  recentReviews = signal<Review[]>([]);
  topProducts = signal<DashboardProductRow[]>([]);
  shipments = signal<Shipment[]>([]);
  private readonly widgetStorageKey = 'sl_dashboard_widgets_v1';
  widgetVisibility = signal<WidgetVisibility>(this.loadWidgetVisibility());

  private rawAnalytics: any = null;
  private corporateMonthlyFallback = signal<{ month: number; revenue: number }[]>([]);
  private chartsReady = false;

  isAdmin = computed(() => this.auth.userRole() === 'ADMIN');
  isCorporate = computed(() => this.auth.userRole() === 'CORPORATE');
  isIndividual = computed(() => this.auth.userRole() === 'INDIVIDUAL');

  roleTitle = computed(() => {
    if (this.isAdmin()) return 'Yonetici Paneli';
    if (this.isCorporate()) return 'Kurumsal Panel';
    return 'Kisisel Panel';
  });

  greeting = computed(() => {
    const hour = new Date().getHours();
    const name = this.auth.displayName() || 'Kullanici';

    if (hour < 12) return `Gunaydin, ${name}`;
    if (hour < 18) return `Iyi gunler, ${name}`;
    return `Iyi aksamlar, ${name}`;
  });

  subtitle = computed(() => {
    if (this.isIndividual()) return 'Siparislerini, kargolarini ve yorumlarini tek bir ekranda yonet.';
    if (this.isCorporate()) return 'Magaza performansini, urunlerini ve musteri hareketlerini takip et.';
    return 'Platform geliri, kullanici trendleri ve operasyon durumunu tek bakista gor.';
  });

  widgetOptions = computed(() => {
    const isIndividual = this.isIndividual();
    return [
      { key: 'stats' as WidgetKey, label: 'KPI kartlari' },
      { key: 'focus' as WidgetKey, label: 'Odak kartlari' },
      { key: 'actions' as WidgetKey, label: 'Hizli islemler' },
      { key: 'charts' as WidgetKey, label: 'Grafikler' },
      { key: 'mainTable' as WidgetKey, label: isIndividual ? 'Son siparislerim' : 'Son siparisler' },
      { key: 'sidePanel' as WidgetKey, label: isIndividual ? 'Yan panel (kargo + oneriler)' : 'Yan panel (performans + yorum)' },
      { key: 'reviews' as WidgetKey, label: isIndividual ? 'Yorum kartlari' : 'Yorum listesi' }
    ];
  });

  constructor(public auth: AuthService, private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void {
    this.setQuickActions();
    this.loadDashboardData();
    this.loadSupportingData();
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    this.tryRenderCharts();
  }

  ngOnDestroy(): void {
    this.revenueChart?.destroy();
    this.categoryChart?.destroy();
  }

  private loadDashboardData(): void {
    this.loading.set(true);

    const endpoint = this.isAdmin() ? 'analytics/admin' : this.isCorporate() ? 'analytics/corporate' : 'analytics/individual';

    this.api.getSummary<any>(endpoint).subscribe({
      next: (data) => {
        this.rawAnalytics = data;
        this.applyRoleSpecificSummary(data);
        this.loading.set(false);
        this.scheduleChartRender();
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || err?.error?.error || err?.error?.details || err?.message || 'Bilinmeyen hata';
        this.toast.error(`Dashboard yuklenemedi: ${msg}`);
      }
    });
  }

  private loadSupportingData(): void {
    this.loadRecentOrders();
    this.loadShipments();
    this.loadReviews();
  }

  private applyRoleSpecificSummary(data: any): void {
    if (this.isAdmin()) {
      const orderCount = this.toNumber(data?.summary?.order_count);
      const revenue = this.toNumber(data?.summary?.total_revenue);
      const users = this.toNumber(data?.platform?.user_count);
      const stores = this.toNumber(data?.platform?.store_count);
      const activeStores = this.toNumber(data?.platform?.active_store_count);
      const reviews = this.toNumber(data?.platform?.review_count);
      const avgRating = this.toNumber(data?.platform?.average_rating);

      this.stats.set([
        { label: 'Platform Geliri', value: this.formatMoney(revenue), hint: `${orderCount} siparis`, icon: 'revenue' },
        { label: 'Kullanicilar', value: this.formatCount(users), hint: 'toplam kayit', icon: 'customers' },
        { label: 'Magazalar', value: this.formatCount(stores), hint: `${activeStores} aktif`, icon: 'products' },
        { label: 'Yorumlar', value: this.formatCount(reviews), hint: `${avgRating.toFixed(1)} ortalama puan`, icon: 'review' }
      ]);

      this.focusCards.set([
        {
          title: 'Aylik Ortalama Siparis',
          value: this.formatMoney(this.toNumber(data?.summary?.average_order)),
          detail: 'Platform genelinde ortalama sepet'
        },
        {
          title: 'Kategori Cesitliligi',
          value: this.formatCount(this.toNumber(data?.platform?.category_count)),
          detail: 'Aktif urun kategorisi'
        },
        {
          title: 'Toplam Urun',
          value: this.formatCount(this.toNumber(data?.platform?.product_count)),
          detail: 'Katalogdaki urun adedi'
        }
      ]);

      const topStores = Array.isArray(data?.topStores) ? data.topStores : [];
      this.topProducts.set(topStores.map((store: any) => ({
        id: this.toNumber(store.id),
        name: store.name || 'Magaza',
        category: 'Magaza',
        metric: this.formatMoney(this.toNumber(store.revenue)),
        detail: `${this.toNumber(store.order_count)} siparis`
      })));

      const analyticsReviews = Array.isArray(data?.recentReviews) ? data.recentReviews : [];
      if (analyticsReviews.length > 0) {
        this.recentReviews.set(analyticsReviews.map((review: any) => this.normalizeReview(review)));
      }

      return;
    }

    if (this.isCorporate()) {
      const corporateOrders = Array.isArray(data?.recentOrders) ? data.recentOrders : [];
      const orderCount = this.toNumber(data?.summary?.order_count);
      const summaryRevenue = this.toNumber(data?.summary?.total_revenue);
      const fallbackRevenue = corporateOrders.reduce((sum: number, order: any) => sum + this.toNumber(order?.grand_total), 0);
      const revenue = summaryRevenue > 0 ? summaryRevenue : fallbackRevenue;
      const totalProducts = this.toNumber(data?.products?.total_products);
      const lowStock = this.toNumber(data?.products?.low_stock_count);
      const customerSegments = Array.isArray(data?.customerSegments) ? data.customerSegments : [];
      const revenueByCategory = Array.isArray(data?.revenueByCategory) ? data.revenueByCategory : [];
      const topSegment = customerSegments[0];

      this.stats.set([
        { label: 'Magaza Geliri', value: this.formatMoney(revenue), hint: `${orderCount} siparis`, icon: 'revenue' },
        { label: 'Toplam Urun', value: this.formatCount(totalProducts), hint: `${lowStock} kritik stok`, icon: 'products' },
        { label: 'Dusuk Stok Orani', value: `${this.percent(lowStock, totalProducts)}%`, hint: '10 altindaki urunler', icon: 'shipment' }
      ]);

      this.focusCards.set([
        {
          title: 'Siparis Basina Gelir',
          value: this.formatMoney(orderCount > 0 ? revenue / orderCount : 0),
          detail: 'Magaza sepet ortalamasi'
        },
        {
          title: 'Stok Sagdligi',
          value: `${Math.max(0, 100 - this.percent(lowStock, totalProducts))}%`,
          detail: 'Kritik stok disi urun orani'
        },
        {
          title: 'Musteri Segmenti',
          value: topSegment?.segment || 'Genel',
          detail: `${this.formatCount(this.toNumber(topSegment?.customer_count))} musteri`
        }
      ]);

      if (revenueByCategory.length > 0) {
        this.topProducts.set(revenueByCategory.map((row: any, index: number) => ({
          id: index + 1,
          name: row.name || 'Kategori',
          category: 'Kategori',
          metric: this.formatMoney(this.toNumber(row.revenue)),
          detail: `${this.formatCount(this.toNumber(row.sold_count))} satis`
        })));
      }

      if (corporateOrders.length > 0) {
        this.recentOrders.set(corporateOrders.map((order: any) => ({
          id: this.toNumber(order.id),
          customer: this.displayNameFromEmail(order.customer_email),
          amount: this.formatMoney(this.toNumber(order.grand_total)),
          status: this.statusLabel(order.status),
          statusClass: this.statusClass(order.status),
          date: this.formatDate(order.order_date),
          itemCount: 1
        })));
      }

      return;
    }

    const totalSpent = this.toNumber(data?.summary?.total_spent);
    const orderCount = this.toNumber(data?.summary?.order_count);
    const totalShipments = this.toNumber(data?.shipments?.total_shipments);
    const activeShipments = this.toNumber(data?.shipments?.active_shipments);

    this.stats.set([
      { label: 'Toplam Harcama', value: this.formatMoney(totalSpent), hint: `${orderCount} siparis`, icon: 'revenue' },
      { label: 'Aktif Kargo', value: this.formatCount(activeShipments), hint: 'teslim edilmeyi bekleyen', icon: 'shipment' },
      { label: 'Tum Kargo', value: this.formatCount(totalShipments), hint: 'olusan sevkiyat', icon: 'orders' }
    ]);

    this.focusCards.set([
      {
        title: 'Siparis Basina Harcama',
        value: this.formatMoney(orderCount > 0 ? totalSpent / orderCount : 0),
        detail: 'Ortalama sepet tutari'
      },
      {
        title: 'Teslimat Ilerlemesi',
        value: `${this.percent(totalShipments - activeShipments, totalShipments)}%`,
        detail: 'Tamamlanan sevkiyat orani'
      },
      {
        title: 'Alisveris Ritim',
        value: orderCount > 2 ? 'Duzenli' : 'Baslangic',
        detail: 'Siparis gecmisi bazli ozet'
      }
    ]);
  }

  private loadRecentOrders(): void {
    this.api.getPage<Order>('orders', 0, 6, { sort: 'id,desc' }).subscribe({
      next: (res) => {
        const rows = res.content.map((order) => ({
          id: order.id,
          customer: this.displayNameFromEmail(order.user?.email),
          amount: this.formatMoney(order.grandTotal),
          status: this.statusLabel(this.resolveOrderStatus(order.id, order.status)),
          statusClass: this.statusClass(this.resolveOrderStatus(order.id, order.status)),
          date: this.formatDate(order.orderDate),
          itemCount: order.items?.length || 1
        }));

        if (!this.isCorporate() || this.recentOrders().length === 0) {
          this.recentOrders.set(rows);
        }

        if (this.topProducts().length === 0) {
          this.topProducts.set(this.buildTopProductsFromOrders(res.content));
        }

        if (this.isCorporate()) {
          this.refreshCorporateRevenueFallback();
        }
      }
    });
  }

  private loadShipments(): void {
    this.api.getPage<Shipment>('shipments', 0, 2000, { sort: 'id,desc' }).subscribe({
      next: (res) => {
        this.shipments.set(res.content || []);
        this.refreshOrderStatusesFromShipments();
      }
    });
  }

  private refreshOrderStatusesFromShipments(): void {
    if (!this.recentOrders().length) return;
    this.recentOrders.update(rows =>
      rows.map(row => {
        const resolved = this.resolveOrderStatus(row.id, row.status);
        return {
          ...row,
          status: this.statusLabel(resolved),
          statusClass: this.statusClass(resolved)
        };
      })
    );
  }

  private resolveOrderStatus(orderId: number, fallback: string | null | undefined): string {
    const list = this.shipments().filter(s => s.order?.id === orderId);
    const normalizedFallback = (fallback || '').toLowerCase();
    if (normalizedFallback.includes('deliver') || normalizedFallback.includes('teslim') || normalizedFallback.includes('cancel') || normalizedFallback.includes('iptal')) {
      return fallback || 'Pending';
    }
    if (!list.length) return fallback || 'Pending';

    // If any shipment is delivered, reflect delivered in dashboard.
    const delivered = list.find(s => this.statusClass(s.status) === 'success');
    if (delivered?.status) return delivered.status;

    // Otherwise use the latest shipment record.
    const latest = list.reduce((max, cur) => (this.toNumber(cur?.id) > this.toNumber(max?.id) ? cur : max), list[0]);
    return latest?.status || fallback || 'Pending';
  }

  private refreshCorporateRevenueFallback(): void {
    this.api.getAll<Order>('orders', { size: 2000 }).subscribe({
      next: (orders) => {
        const list = orders || [];
        const total = list.reduce((sum, o) => sum + this.toNumber(o?.grandTotal), 0);
        if (total <= 0) return;
        this.stats.update(items => {
          if (!items.length) return items;
          const first = items[0];
          if (first.label !== 'Magaza Geliri') return items;
          return [{ ...first, value: this.formatMoney(total) }, ...items.slice(1)];
        });

        const monthlyMap = new Map<number, number>();
        list.forEach(order => {
          if (!order?.orderDate) return;
          const dt = new Date(order.orderDate);
          if (Number.isNaN(dt.getTime())) return;
          const month = dt.getMonth() + 1;
          monthlyMap.set(month, (monthlyMap.get(month) || 0) + this.toNumber(order.grandTotal));
        });
        const monthly = Array.from(monthlyMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([month, revenue]) => ({ month, revenue }));
        this.corporateMonthlyFallback.set(monthly);
        this.scheduleChartRender();
      }
    });
  }

  private loadReviews(): void {
    this.api.getPage<Review>('reviews', 0, 6, { sort: 'id,desc' }).subscribe({
      next: (res) => {
        if (this.recentReviews().length === 0) {
          this.recentReviews.set((res.content || []).map((review) => this.normalizeReview(review)));
        }
      }
    });
  }

  private buildTopProductsFromOrders(orders: Order[]): DashboardProductRow[] {
    const map = new Map<number, { id: number; name: string; category: string; qty: number; revenue: number }>();

    orders.forEach((order) => {
      (order.items || []).forEach((item: OrderItem) => {
        const productId = item.product?.id;
        if (!productId) return;

        const existing = map.get(productId) || {
          id: productId,
          name: item.product?.name || `Urun #${productId}`,
          category: item.product?.category?.name || 'Kategori yok',
          qty: 0,
          revenue: 0
        };

        const qty = this.toNumber(item.quantity);
        const lineRevenue = this.toNumber(item.price) * Math.max(1, qty);

        existing.qty += Math.max(1, qty);
        existing.revenue += lineRevenue;
        map.set(productId, existing);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
      .map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        metric: this.formatMoney(product.revenue),
        detail: `${product.qty} adet`
      }));
  }

  private normalizeReview(review: any): Review {
    return {
      id: this.toNumber(review?.id),
      starRating: this.toNumber(review?.star_rating ?? review?.starRating),
      helpfulnessVotes: this.toNumber(review?.helpfulness_votes ?? review?.helpfulnessVotes),
      sentiment: review?.sentiment || 'Yorum yok',
      user: review?.user
        ? review.user
        : { id: 0, email: review?.user_email || 'musteri@local', roleType: 'INDIVIDUAL' },
      product: review?.product
        ? review.product
        : {
            id: 0,
            sku: '-',
            name: review?.product_name || 'Urun',
            description: '-',
            unitPrice: 0
          }
    };
  }

  private setQuickActions(): void {
    if (this.isAdmin()) {
      this.quickActions.set([
        { label: 'Kullanicilar', link: '/app/users', tone: 'secondary' },
        { label: 'Magazalar', link: '/app/stores', tone: 'secondary' },
        { label: 'Analitik', link: '/app/analytics', tone: 'primary' },
        { label: 'Yorumlar', link: '/app/reviews', tone: 'ghost' }
      ]);
      return;
    }

    if (this.isCorporate()) {
      this.quickActions.set([
        { label: 'Urunlerim', link: '/app/products', tone: 'secondary' },
        { label: 'Siparisler', link: '/app/orders', tone: 'secondary' },
        { label: 'Analitik', link: '/app/analytics', tone: 'primary' },
        { label: 'Kargolar', link: '/app/shipments', tone: 'ghost' }
      ]);
      return;
    }

    this.quickActions.set([
      { label: 'Alisverise devam', link: '/app/products', tone: 'primary' },
      { label: 'Sepetim', link: '/app/cart', tone: 'secondary' },
      { label: 'Siparislerim', link: '/app/orders', tone: 'secondary' },
      { label: 'Profilim', link: '/app/profile', tone: 'ghost' }
    ]);
  }

  private scheduleChartRender(): void {
    setTimeout(() => this.tryRenderCharts(), 0);
  }

  private tryRenderCharts(): void {
    if (!this.chartsReady || !this.revenueCanvas || !this.categoryCanvas || this.loading()) return;

    const data = this.rawAnalytics;
    if (!data) return;

    this.revenueChart?.destroy();
    this.categoryChart?.destroy();

    const monthlySource = this.isIndividual() ? data?.monthlySpending : data?.monthlyRevenue;
    let monthlyRows = Array.isArray(monthlySource) ? monthlySource : [];
    if (this.isCorporate() && monthlyRows.length === 0 && this.corporateMonthlyFallback().length > 0) {
      monthlyRows = this.corporateMonthlyFallback();
    }

    const lineLabels = monthlyRows.map((m: any) => `Ay ${this.toNumber(m.month)}`);
    const lineValues = monthlyRows.map((m: any) => this.toNumber(this.isIndividual() ? m.spent : m.revenue));

    this.revenueChart = new Chart(this.revenueCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: lineLabels.length ? lineLabels : ['Veri yok'],
        datasets: [
          {
            label: this.isIndividual() ? 'Harcama' : 'Gelir',
            data: lineValues.length ? lineValues : [0],
            borderColor: '#4f46e5',
            pointRadius: 3,
            pointHoverRadius: 4,
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            backgroundColor: 'rgba(79, 70, 229, 0.12)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.18)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });

    let pieLabels: string[] = [];
    let pieValues: number[] = [];

    if (this.isAdmin()) {
      const rows = Array.isArray(data?.statusDistribution) ? data.statusDistribution : [];
      pieLabels = rows.map((s: any) => this.statusLabel(s.status));
      pieValues = rows.map((s: any) => this.toNumber(s.count));
    } else if (this.isCorporate()) {
      const categoryRows = Array.isArray(data?.revenueByCategory) ? data.revenueByCategory : [];
      if (categoryRows.length > 0) {
        pieLabels = categoryRows.map((row: any) => row.name || 'Diger');
        pieValues = categoryRows.map((row: any) => this.toNumber(row.revenue));
      } else {
        const totalProducts = this.toNumber(data?.products?.total_products);
        const lowStock = this.toNumber(data?.products?.low_stock_count);
        const healthy = Math.max(0, totalProducts - lowStock);
        pieLabels = ['Saglikli Stok', 'Kritik Stok'];
        pieValues = [healthy, lowStock];
      }
    } else {
      const totalShipments = this.toNumber(data?.shipments?.total_shipments);
      const activeShipments = this.toNumber(data?.shipments?.active_shipments);
      pieLabels = ['Tamamlanan', 'Aktif'];
      pieValues = [Math.max(0, totalShipments - activeShipments), activeShipments];
    }

    this.categoryChart = new Chart(this.categoryCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: pieLabels.length ? pieLabels : ['Veri yok'],
        datasets: [
          {
            data: pieValues.length ? pieValues : [1],
            backgroundColor: ['#4f46e5', '#0891b2', '#f59e0b', '#10b981', '#ef4444'],
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  trackQuickAction(_: number, action: QuickAction): string {
    return `${action.link}:${action.label}`;
  }

  isWidgetVisible(key: WidgetKey): boolean {
    return !!this.widgetVisibility()[key];
  }

  shouldShowContentGrid(): boolean {
    return this.isWidgetVisible('mainTable') || this.isWidgetVisible('sidePanel');
  }

  isSingleColumnContent(): boolean {
    return this.isWidgetVisible('mainTable') !== this.isWidgetVisible('sidePanel');
  }

  toggleWidget(key: WidgetKey, checked: boolean): void {
    const next = { ...this.widgetVisibility(), [key]: checked };
    this.widgetVisibility.set(next);
    localStorage.setItem(this.widgetStorageKey, JSON.stringify(next));
    this.scheduleChartRender();
  }

  actionClass(tone: QuickAction['tone']): string {
    return tone === 'primary' ? 'btn-primary' : tone === 'secondary' ? 'btn-secondary' : 'btn-ghost';
  }

  statusLabel(status: string | null | undefined): string {
    const s = (status || '').toLowerCase();
    if (s.includes('deliver') || s.includes('teslim')) return 'Teslim Edildi';
    if (s.includes('ship') || s.includes('transit') || s.includes('kargo')) return 'Kargoda';
    if (s.includes('process') || s.includes('hazir')) return 'Hazirlaniyor';
    if (s.includes('cancel') || s.includes('iptal')) return 'Iptal';
    return 'Bekliyor';
  }

  statusClass(status: string | null | undefined): string {
    const s = (status || '').toLowerCase();
    if (s.includes('deliver') || s.includes('teslim')) return 'success';
    if (s.includes('ship') || s.includes('transit') || s.includes('kargo')) return 'warning';
    if (s.includes('process') || s.includes('hazir')) return 'primary';
    if (s.includes('cancel') || s.includes('iptal')) return 'danger';
    return 'secondary';
  }

  starText(rating: number | null | undefined): string {
    const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return `${'★'.repeat(value)}${'☆'.repeat(5 - value)}`;
  }

  productName(review: Review): string {
    return review.product?.name || 'Urun';
  }

  userName(review: Review): string {
    return this.displayNameFromEmail(review.user?.email);
  }

  formatMoney(value: number | null | undefined): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(value) || 0);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
  }

  formatCount(value: number | null | undefined): string {
    return (Number(value) || 0).toLocaleString('tr-TR');
  }

  private displayNameFromEmail(email: string | null | undefined): string {
    return (email || 'Musteri').split('@')[0] || 'Musteri';
  }

  private loadWidgetVisibility(): WidgetVisibility {
    const defaults: WidgetVisibility = {
      stats: true,
      focus: true,
      actions: true,
      charts: true,
      mainTable: true,
      sidePanel: true,
      reviews: true
    };

    try {
      const raw = localStorage.getItem(this.widgetStorageKey);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private percent(part: number, total: number): number {
    if (total <= 0) return 0;
    return Math.round((Math.max(0, part) / total) * 100);
  }
}
