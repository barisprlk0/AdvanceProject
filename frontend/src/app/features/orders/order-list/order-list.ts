import { Component, signal, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Order } from '../../../core/models';

@Component({
  selector: 'app-order-list',
  templateUrl: './order-list.html',
  styleUrl: './order-list.css'
})
export class OrderListComponent implements OnInit {
  activeTab = signal('all');
  orders = signal<any[]>([]);
  loading = signal(true);

  tabs = signal([
    { key: 'all', label: 'Tümü', count: 0 },
  ]);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getAll<Order>('orders').subscribe({
      next: (data) => {
        const mapped = data.map(o => ({
          id: `ORD-${o.id}`,
          customer: o.user?.email?.split('@')[0] || `Müşteri #${o.user?.id || '?'}`,
          email: o.user?.email || '—',
          items: '—',
          amount: o.grandTotal || 0,
          status: o.status || 'Bekleyen',
          statusKey: this.getStatusClass(o.status),
          payment: o.paymentMethod || '—',
          date: o.orderDate ? new Date(o.orderDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
        }));
        this.orders.set(mapped);
        this.tabs.set([{ key: 'all', label: 'Tümü', count: data.length }]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
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
