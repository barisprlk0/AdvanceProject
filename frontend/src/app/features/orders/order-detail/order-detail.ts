import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Order, OrderItem, Shipment } from '../../../core/models';

@Component({
  selector: 'app-order-detail',
  imports: [RouterLink],
  template: `
    <div class="order-detail-page fade-in">
      <div class="page-header detail-header">
        <div class="header-left">
          <button class="btn btn-ghost btn-icon" routerLink="/app/orders" aria-label="Siparişlere dön">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <div>
            <h1 class="page-title">Sipariş #{{ orderId }}</h1>
            <p class="page-subtitle">{{ order() ? formatDate(order()?.orderDate) : 'Sipariş detayları yükleniyor' }}</p>
          </div>
        </div>

        @if (order() && canManageOrder()) {
          <div class="detail-actions">
            @if (!isFinalStatus(effectiveStatus())) {
              <button class="btn btn-secondary btn-sm" (click)="setStatus('Cancelled')">İptal Et</button>
            }
            @if (canShipOrder()) {
              <button class="btn btn-primary btn-sm" (click)="shipOrder()">Kargoya Ver</button>
            }
          </div>
        }
      </div>

      @if (loading()) {
        <div class="card state-card">
          <span class="spinner"></span>
          <p>Sipariş bilgileri yükleniyor...</p>
        </div>
      } @else if (errorMessage()) {
        <div class="card state-card">
          <div class="state-icon">!</div>
          <h3>Sipariş açılamadı</h3>
          <p>{{ errorMessage() }}</p>
          <button class="btn btn-primary" routerLink="/app/orders">Siparişlere Dön</button>
        </div>
      } @else if (order()) {
        <div class="overview-grid">
          <div class="overview-card">
            <span>Durum</span>
            <strong class="badge" [class]="'badge-' + getStatusClass(effectiveStatus())">{{ getStatusLabel(effectiveStatus()) }}</strong>
          </div>
          <div class="overview-card"><span>Toplam</span><strong>{{ formatMoney(orderTotal()) }}</strong></div>
          <div class="overview-card"><span>Ürün Adedi</span><strong>{{ itemCount() }}</strong></div>
          <div class="overview-card"><span>Ödeme</span><strong>{{ order()?.paymentMethod || 'Belirtilmedi' }}</strong></div>
          <div class="overview-card"><span>Kargo</span><strong>{{ getStatusLabel(shipment()?.status) }}</strong></div>
        </div>

        <div class="detail-layout">
          <section class="main-column">
            <div class="card">
              <div class="section-head">
                <div>
                  <h3 class="card-title">Ürünler</h3>
                  <p class="card-subtitle">{{ itemCount() }} ürün kalemi</p>
                </div>
              </div>

              <div class="table-wrap">
                <table class="data-table detail-table">
                  <thead>
                    <tr>
                      <th>Ürün</th>
                      <th>SKU</th>
                      <th class="numeric">Birim Fiyat</th>
                      <th class="numeric">Adet</th>
                      <th class="numeric">Ara Toplam</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of orderItems(); track $index) {
                      <tr>
                        <td>
                          <div class="product-cell">
                            <div class="product-thumb" [style.background]="productColor(item)">{{ productInitial(item) }}</div>
                            <div>
                              <strong>{{ productName(item) }}</strong>
                              <span>{{ item.product?.category?.name || 'Kategori yok' }}</span>
                            </div>
                          </div>
                        </td>
                        <td>{{ item.product?.sku || '-' }}</td>
                        <td class="numeric">{{ formatMoney(item.price) }}</td>
                        <td class="numeric">{{ item.quantity || 0 }}</td>
                        <td class="numeric strong">{{ formatMoney(itemSubtotal(item)) }}</td>
                      </tr>
                    } @empty {
                      <tr><td colspan="5" class="empty-row">Bu siparişe bağlı ürün kalemi bulunamadı.</td></tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="summary-box">
                <div><span>Ara Toplam</span><strong>{{ formatMoney(computedSubtotal()) }}</strong></div>
                <div><span>Kayıtlı Toplam</span><span>{{ formatMoney(orderTotal()) }}</span></div>
                <div class="summary-total"><span>Genel Toplam</span><strong>{{ formatMoney(orderTotal()) }}</strong></div>
              </div>
            </div>

            <div class="card">
              <h3 class="card-title">Sipariş Süreci</h3>
              <div class="timeline">
                @for (step of timelineSteps; track step.key) {
                  <div class="timeline-step" [class.active]="isTimelineStepActive(step.key)" [class.current]="isCurrentStep(step.key)">
                    <span class="timeline-dot"></span>
                    <strong>{{ step.label }}</strong>
                    <small>{{ step.description }}</small>
                  </div>
                }
              </div>
            </div>
          </section>

          <aside class="side-column">
            <div class="card side-card">
              <h3 class="card-title">Müşteri</h3>
              <div class="person-row">
                <div class="avatar">{{ getInitial(order()?.user?.email) }}</div>
                <div>
                  <strong>{{ order()?.user?.email || 'Müşteri bilgisi yok' }}</strong>
                  <span>{{ getRoleLabel(order()?.user?.roleType) }}</span>
                </div>
              </div>
              <div class="info-list">
                <div><label>Cinsiyet</label><span>{{ order()?.user?.gender || '-' }}</span></div>
                <div><label>Müşteri ID</label><span>#{{ order()?.user?.id || '-' }}</span></div>
              </div>
            </div>

            <div class="card side-card">
              <h3 class="card-title">Mağaza</h3>
              <div class="info-list">
                <div><label>Ad</label><span>{{ order()?.store?.name || '-' }}</span></div>
                <div><label>Durum</label><span>{{ order()?.store?.status || '-' }}</span></div>
                <div><label>Sahip</label><span>{{ order()?.store?.owner?.email || '-' }}</span></div>
              </div>
            </div>

            <div class="card side-card">
              <h3 class="card-title">Kargo</h3>
              <div class="info-list">
                <div><label>Durum</label><span class="badge" [class]="'badge-' + getStatusClass(shipment()?.status)">{{ getStatusLabel(shipment()?.status) }}</span></div>
                <div><label>Depo</label><span>{{ shipment()?.warehouse || '-' }}</span></div>
                <div><label>Yöntem</label><span>{{ shipment()?.mode || '-' }}</span></div>
              </div>
            </div>

            <div class="card side-card">
              <h3 class="card-title">Yönetim</h3>
              @if (canManageOrder()) {
                <div class="status-actions">
                  @for (status of statusOptions; track status.value) {
                    <button class="status-action" [class.active]="normalizeStatus(effectiveStatus()) === status.value.toLowerCase()" (click)="setStatus(status.value)">
                      {{ status.label }}
                    </button>
                  }
                </div>
              } @else {
                <p class="muted">Bu sipariş için yönetim yetkiniz yok.</p>
              }
            </div>
          </aside>
        </div>
      }
    </div>
  `,
  styles: `
    .detail-header,.header-left,.detail-actions,.product-cell,.person-row{display:flex;align-items:center;gap:14px}.detail-header{justify-content:space-between}.state-card{min-height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px}.state-icon{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#fee2e2;color:#dc2626;font-weight:800}.overview-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;margin-bottom:22px}.overview-card{background:var(--bg-surface);border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:16px;min-height:92px;display:flex;flex-direction:column;gap:8px}.overview-card span,.info-list label{font-size:.72rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em}.overview-card strong{font-size:1.05rem;color:var(--text-primary)}.detail-layout{display:grid;grid-template-columns:minmax(0,1fr)340px;gap:24px;align-items:start}.main-column,.side-column{display:flex;flex-direction:column;gap:18px;min-width:0}.section-head{margin-bottom:16px}.table-wrap{overflow-x:auto;border:1px solid var(--border-light);border-radius:var(--radius-lg)}.detail-table{min-width:780px}.numeric{text-align:right;white-space:nowrap}.strong{font-weight:800}.product-thumb,.avatar{width:42px;height:42px;border-radius:var(--radius-md);display:grid;place-items:center;flex-shrink:0;font-weight:800}.avatar{border-radius:50%;background:rgba(79,70,229,.12);color:var(--primary)}.product-cell strong,.person-row strong{display:block}.product-cell span,.person-row span,.muted{color:var(--text-muted);font-size:.8rem}.empty-row{text-align:center;color:var(--text-muted);padding:34px!important}.summary-box{width:min(100%,390px);margin:22px 0 0 auto;border:1px solid var(--border-light);border-radius:var(--radius-lg);padding:18px;background:var(--bg-muted);display:flex;flex-direction:column;gap:12px}.summary-box div{display:flex;justify-content:space-between;gap:18px}.summary-total{border-top:1px solid var(--border-color);padding-top:12px}.timeline{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px}.timeline-step{border:1px solid var(--border-light);border-radius:var(--radius-lg);padding:14px;background:var(--bg-surface);color:var(--text-muted)}.timeline-step.active{border-color:rgba(79,70,229,.32);background:rgba(79,70,229,.06);color:var(--text-primary)}.timeline-step.current{box-shadow:inset 0 0 0 1px var(--primary)}.timeline-dot{width:10px;height:10px;border-radius:50%;display:block;background:var(--border-color);margin-bottom:10px}.active .timeline-dot{background:var(--primary)}.timeline-step strong,.timeline-step small{display:block}.timeline-step small{margin-top:4px;line-height:1.4}.side-card{padding:20px}.info-list{display:flex;flex-direction:column;gap:14px;margin-top:18px}.info-list span{display:block;font-weight:700;word-break:break-word}.status-actions{display:grid;gap:8px;margin-top:16px}.status-action{border:1px solid var(--border-color);background:var(--bg-surface);border-radius:var(--radius-md);padding:10px 12px;text-align:left;font-weight:700;color:var(--text-secondary);cursor:pointer}.status-action:hover{border-color:var(--primary);color:var(--primary)}.status-action.active{background:var(--primary);border-color:var(--primary);color:#fff}@media(max-width:1200px){.overview-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.detail-layout{grid-template-columns:1fr}.timeline{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:720px){.overview-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.timeline{grid-template-columns:1fr}.detail-header{align-items:flex-start}.detail-actions{width:100%}.detail-actions .btn{flex:1}}
  `
})
export class OrderDetailComponent implements OnInit {
  orderId = '';
  order = signal<Order | null>(null);
  shipment = signal<Shipment | null>(null);
  loading = signal(true);
  errorMessage = signal('');

  readonly orderItems = computed(() => this.order()?.items ?? []);
  readonly itemCount = computed(() => this.orderItems().reduce((sum, item) => sum + (Number(item.quantity) || 0), 0));
  readonly computedSubtotal = computed(() => this.orderItems().reduce((sum, item) => sum + this.itemSubtotal(item), 0));
  readonly orderTotal = computed(() => Number(this.order()?.grandTotal ?? this.computedSubtotal()) || 0);
  readonly effectiveStatus = computed(() => this.shipment()?.status || this.order()?.status || '');

  readonly statusOptions = [
    { value: 'Pending', label: 'Bekliyor' },
    { value: 'Processing', label: 'Hazırlanıyor' },
    { value: 'Shipped', label: 'Kargoda' },
    { value: 'Delivered', label: 'Teslim Edildi' },
    { value: 'Cancelled', label: 'İptal Edildi' }
  ];

  readonly timelineSteps = [
    { key: 'pending', label: 'Alındı', description: 'Sipariş sisteme kaydedildi' },
    { key: 'processing', label: 'Hazırlanıyor', description: 'Mağaza siparişi işliyor' },
    { key: 'shipped', label: 'Kargoda', description: 'Kargo kaydı oluşturuldu' },
    { key: 'delivered', label: 'Teslim', description: 'Sipariş müşteriye ulaştı' }
  ];

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    public auth: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    this.fetchOrder();
  }

  fetchOrder(): void {
    if (!this.orderId) {
      this.loading.set(false);
      this.errorMessage.set('Geçerli bir sipariş numarası bulunamadı.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.api.getById<Order>('orders', this.orderId).subscribe({
      next: (data) => {
        this.order.set(data);
        this.loading.set(false);
        this.fetchShipment();
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.error || 'Bu sipariş bulunamadı ya da görüntüleme yetkiniz yok.');
      }
    });
  }

  fetchShipment(): void {
    this.api.getAll<Shipment>('shipments').subscribe({
      next: (shipments) => {
        const match = shipments.find((item) => item.order?.id?.toString() === this.orderId);
        this.shipment.set(match || null);
      },
      error: () => this.shipment.set(null)
    });
  }

  setStatus(status: string): void {
    const order = this.order();
    if (!order) return;

    this.api.patch<Order>('orders', order.id, { status }).subscribe({
      next: (updated) => {
        this.order.set({ ...order, ...updated });
        this.syncShipmentStatus(status);
        this.toast.success('Sipariş durumu güncellendi.');
      },
      error: () => this.toast.error('Sipariş durumu güncellenemedi.')
    });
  }

  shipOrder(): void {
    const order = this.order();
    if (!order) return;

    this.api.create<Order>(`orders/${order.id}/ship`, {}).subscribe({
      next: (updated) => {
        this.order.set({ ...order, ...updated });
        this.fetchShipment();
        this.toast.success('Sipariş kargoya verildi.');
      },
      error: () => this.toast.error('Kargolama işlemi başarısız oldu.')
    });
  }

  syncShipmentStatus(status: string): void {
    const shipment = this.shipment();
    if (!shipment) return;

    this.api.patch<Shipment>('shipments', shipment.id, { status }).subscribe({
      next: (updated) => this.shipment.set({ ...shipment, ...updated }),
      error: () => this.fetchShipment()
    });
  }

  canManageOrder(): boolean {
    return this.auth.hasAnyRole('ADMIN', 'CORPORATE');
  }

  canShipOrder(): boolean {
    const status = this.normalizeStatus(this.effectiveStatus());
    return this.canManageOrder() && status !== 'shipped' && status !== 'delivered' && status !== 'cancelled';
  }

  itemSubtotal(item: OrderItem): number {
    return (Number(item.price) || 0) * (Number(item.quantity) || 0);
  }

  productName(item: OrderItem): string {
    return item.product?.name || item.product?.description || `Ürün #${item.product?.id || item.id}`;
  }

  productInitial(item: OrderItem): string {
    return this.productName(item).charAt(0).toUpperCase();
  }

  productColor(item: OrderItem): string {
    const id = item.product?.id || item.id || 1;
    return `hsl(${(id * 37) % 360}, 45%, 92%)`;
  }

  getInitial(value: string | undefined): string {
    return value?.charAt(0).toUpperCase() || '?';
  }

  getRoleLabel(role: string | undefined): string {
    const value = this.normalizeStatus(role);
    if (value === 'corporate') return 'Kurumsal';
    if (value === 'admin') return 'Admin';
    return 'Bireysel';
  }

  formatMoney(value: number | null | undefined): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(value) || 0);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  normalizeStatus(status: string | null | undefined): string {
    return (status || '').toLowerCase();
  }

  getStatusLabel(status: string | null | undefined): string {
    const s = this.normalizeStatus(status);
    if (s.includes('deliver') || s.includes('teslim')) return 'Teslim Edildi';
    if (s.includes('ship') || s.includes('transit') || s.includes('kargo')) return 'Kargoda';
    if (s.includes('process') || s.includes('hazır')) return 'Hazırlanıyor';
    if (s.includes('cancel') || s.includes('iptal')) return 'İptal Edildi';
    if (s.includes('pending') || s.includes('bekle')) return 'Bekliyor';
    return status || 'Kargo yok';
  }

  getStatusClass(status: string | null | undefined): string {
    const s = this.normalizeStatus(status);
    if (s.includes('deliver') || s.includes('teslim')) return 'success';
    if (s.includes('ship') || s.includes('transit') || s.includes('kargo')) return 'warning';
    if (s.includes('cancel') || s.includes('iptal')) return 'danger';
    if (s.includes('process') || s.includes('hazır')) return 'primary';
    return 'secondary';
  }

  isFinalStatus(status: string | null | undefined): boolean {
    const s = this.normalizeStatus(status);
    return s.includes('deliver') || s.includes('cancel') || s.includes('teslim') || s.includes('iptal');
  }

  isTimelineStepActive(key: string): boolean {
    const status = this.effectiveStatus();
    if (!status || this.normalizeStatus(status).includes('cancel')) return key === 'pending';

    const currentIndex = this.timelineIndex(status);
    const stepIndex = this.timelineSteps.findIndex(step => step.key === key);
    return stepIndex <= currentIndex;
  }

  isCurrentStep(key: string): boolean {
    return this.timelineSteps[this.timelineIndex(this.effectiveStatus())]?.key === key;
  }

  private timelineIndex(status: string | null | undefined): number {
    const s = this.normalizeStatus(status);
    if (s.includes('deliver') || s.includes('teslim')) return 3;
    if (s.includes('ship') || s.includes('transit') || s.includes('kargo')) return 2;
    if (s.includes('process') || s.includes('hazır')) return 1;
    return 0;
  }
}
