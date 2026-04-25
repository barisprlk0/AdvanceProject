import { CurrencyPipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Order, Shipment } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-order-list',
  imports: [RouterLink, CurrencyPipe, PaginationComponent],
  templateUrl: './order-list.html',
  styleUrl: './order-list.css'
})
export class OrderListComponent implements OnInit {
  activeTab = signal('all');
  orders = signal<any[]>([]);
  allMappedOrders = signal<any[]>([]);
  shipments = signal<Shipment[]>([]);
  loading = signal(true);

  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);
  totalPages = signal(0);

  tabs = signal([
    { key: 'all', label: 'Tümü', count: 0 },
    { key: 'processing', label: 'Hazırlanıyor', count: 0 },
    { key: 'shipped', label: 'Kargoda', count: 0 },
    { key: 'delivered', label: 'Teslim Edildi', count: 0 },
    { key: 'cancelled', label: 'İptal', count: 0 }
  ]);

  canManageOrders = computed(() => {
    const role = this.auth.userRole();
    return role === 'ADMIN' || role === 'CORPORATE';
  });

  constructor(
    private api: ApiService,
    private toast: ToastService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchOrders();
  }

  fetchOrders(): void {
    this.loading.set(true);
    this.api.getPage<Order>('orders', this.currentPage(), this.pageSize(), { sort: 'id,desc' }).subscribe({
      next: (res) => {
        this.totalElements.set(res.totalElements);
        this.totalPages.set(res.totalPages);
        this.fetchShipmentsAndApplyOrders(res.content);
      },
      error: () => {
        this.loading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  private fetchShipmentsAndApplyOrders(orders: Order[]): void {
    this.api.getAll<Shipment>('shipments').subscribe({
      next: (shipments) => {
        this.shipments.set(shipments);
        this.applyOrders(orders, shipments);
      },
      error: () => this.applyOrders(orders, [])
    });
  }

  private applyOrders(orders: Order[], shipments: Shipment[]): void {
    const mapped = orders.map(order => {
      const effectiveStatus = this.getEffectiveStatus(order, shipments);
      return {
        id: order.id,
        displayId: `ORD-${order.id}`,
        customer: order.user?.email?.split('@')[0] || `Müşteri #${order.user?.id || '?'}`,
        email: order.user?.email || '-',
        items: order.items?.length || 0,
        amount: order.grandTotal || 0,
        status: this.getStatusLabel(effectiveStatus),
        rawStatus: effectiveStatus,
        statusKey: this.getStatusClass(effectiveStatus),
        payment: order.paymentMethod || '-',
        date: order.orderDate
          ? new Date(order.orderDate).toLocaleDateString('tr-TR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : '-'
      };
    });

    this.allMappedOrders.set(mapped);
    this.orders.set(this.filterByActiveTab(mapped));
    this.updateTabCounts(mapped);
    this.loading.set(false);
    this.cdr.detectChanges();
  }

  setActiveTab(tabKey: string): void {
    this.activeTab.set(tabKey);
    this.orders.set(this.filterByActiveTab(this.allMappedOrders()));
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.fetchOrders();
  }

  updateOrderStatus(order: any, newStatus: string, event: Event): void {
    event.stopPropagation();
    this.api.patch('orders', order.id, { status: newStatus }).subscribe({
      next: () => {
        this.syncShipmentStatus(order.id, newStatus);
        this.toast.success('Sipariş durumu güncellendi.');
        this.fetchOrders();
      },
      error: () => this.toast.error('Güncelleme başarısız.')
    });
  }

  shipOrder(order: any, event: Event): void {
    event.stopPropagation();
    this.api.create(`orders/${order.id}/ship`, {}).subscribe({
      next: () => {
        this.toast.success('Sipariş kargoya verildi ve kargo kaydı oluşturuldu.');
        this.fetchOrders();
      },
      error: () => this.toast.error('Kargolama işlemi başarısız oldu.')
    });
  }

  getInitial(name: string): string {
    return name?.charAt(0)?.toUpperCase() || '?';
  }

  isFinalStatus(status: string | null | undefined): boolean {
    const s = this.normalizeStatus(status);
    return s.includes('deliver') || s.includes('cancel') || s.includes('teslim') || s.includes('iptal');
  }

  getStatusLabel(status: string | null | undefined): string {
    const s = this.normalizeStatus(status);
    if (s.includes('deliver') || s.includes('teslim')) return 'Teslim Edildi';
    if (s.includes('ship') || s.includes('transit') || s.includes('kargo')) return 'Kargoda';
    if (s.includes('process') || s.includes('hazır')) return 'Hazırlanıyor';
    if (s.includes('cancel') || s.includes('iptal')) return 'İptal Edildi';
    return 'Bekliyor';
  }

  private getEffectiveStatus(order: Order, shipments: Shipment[]): string {
    const shipment = shipments.find(item => item.order?.id === order.id);
    return shipment?.status || order.status || 'Pending';
  }

  private syncShipmentStatus(orderId: number, status: string): void {
    const shipment = this.shipments().find(item => item.order?.id === orderId);
    if (shipment) {
      this.api.patch('shipments', shipment.id, { status }).subscribe();
    }
  }

  private filterByActiveTab(orders: any[]): any[] {
    const tab = this.activeTab();
    if (tab === 'all') return orders;
    return orders.filter(order => this.normalizeStatus(order.rawStatus).includes(tab));
  }

  private updateTabCounts(orders: any[]): void {
    this.tabs.update(tabs => tabs.map(tab => {
      if (tab.key === 'all') return { ...tab, count: this.totalElements() };
      return {
        ...tab,
        count: orders.filter(order => this.normalizeStatus(order.rawStatus).includes(tab.key)).length
      };
    }));
  }

  private normalizeStatus(status: string | null | undefined): string {
    return (status || '').toLowerCase();
  }

  private getStatusClass(status: string | null | undefined): string {
    const s = this.normalizeStatus(status);
    if (s.includes('deliver') || s.includes('teslim')) return 'success';
    if (s.includes('ship') || s.includes('transit') || s.includes('kargo')) return 'warning';
    if (s.includes('process') || s.includes('hazır')) return 'primary';
    if (s.includes('cancel') || s.includes('iptal')) return 'danger';
    return 'secondary';
  }
}
