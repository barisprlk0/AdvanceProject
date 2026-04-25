import { Component, signal, OnInit, computed, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Order } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';
import { CurrencyPipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

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
  loading = signal(true);
  
  // Pagination
  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);
  totalPages = signal(0);

  tabs = signal([
    { key: 'all', label: 'Tümü', count: 0 },
    { key: 'processing', label: 'Hazırlanıyor', count: 0 },
    { key: 'shipped', label: 'Kargoda', count: 0 },
    { key: 'delivered', label: 'Teslim Edildi', count: 0 },
    { key: 'cancelled', label: 'İptal', count: 0 },
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
    
    // In a real app, we would send the activeTab to the backend for filtering
    // But since the current backend doesn't support filtering by status in Pageable yet,
    // we'll just fetch paged results.
    const params: any = {
      sort: 'id,desc'
    };

    this.api.getPage<Order>('orders', this.currentPage(), this.pageSize(), params).subscribe({
      next: (res) => {
        const mapped = res.content.map(o => ({
          id: o.id,
          displayId: `ORD-${o.id}`,
          customer: o.user?.email?.split('@')[0] || `Müşteri #${o.user?.id || '?'}`,
          email: o.user?.email || '—',
          items: o.items?.length || 0,
          amount: o.grandTotal || 0,
          status: o.status || 'Bekleyen',
          statusKey: this.getStatusClass(o.status),
          payment: o.paymentMethod || '—',
          date: o.orderDate ? new Date(o.orderDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
        }));
        this.orders.set(mapped);
        this.totalElements.set(res.totalElements);
        this.totalPages.set(res.totalPages);
        
        // Update tab counts (mocked for now based on total elements)
        this.tabs.update(tabs => tabs.map(t => t.key === 'all' ? { ...t, count: res.totalElements } : t));
        
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.fetchOrders();
  }

  updateOrderStatus(order: any, newStatus: string, event: Event): void {
    event.stopPropagation();
    this.api.patch('orders', order.id, { status: newStatus }).subscribe({
      next: () => {
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

  private getStatusClass(status: string | null | undefined): string {
    const s = status?.toLowerCase() || '';
    if (s.includes('deliver') || s.includes('teslim')) return 'success';
    if (s.includes('ship') || s.includes('kargo')) return 'warning';
    if (s.includes('process') || s.includes('hazır')) return 'primary';
    if (s.includes('cancel') || s.includes('iptal')) return 'danger';
    return 'secondary';
  }
}
