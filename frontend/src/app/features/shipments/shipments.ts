import { Component, signal, OnInit, computed } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Shipment } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination';

@Component({
  selector: 'app-shipments',
  imports: [PaginationComponent],
  template: `
    <div class="shipments-page fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Kargolar</h1>
          <p class="page-subtitle">Toplam {{ totalElements() }} kargo kaydı</p>
        </div>
      </div>

      <div class="stats-row">
        <div class="mini-stat"><span class="mini-label">Toplam Kargo</span><span class="mini-value">{{ totalElements() }}</span></div>
        <div class="mini-stat"><span class="mini-label">Teslim Edildi</span><span class="mini-value">{{ deliveredCount() }}</span></div>
        <div class="mini-stat"><span class="mini-label">Yolda</span><span class="mini-value">{{ inTransitCount() }}</span></div>
        <div class="mini-stat"><span class="mini-label">Depo Sayısı</span><span class="mini-value">{{ warehouseCount() }}</span></div>
      </div>

      @if (loading()) {
        <div class="card" style="text-align:center;padding:40px"><p style="color:var(--text-muted)">Yükleniyor...</p></div>
      } @else {
        <div class="card" style="padding:0;overflow:hidden">
          <table class="data-table">
            <thead>
              <tr>
                <th>Sipariş</th>
                <th>Depo</th>
                <th>Gönderim Türü</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              @for (s of shipments(); track s.id) {
                <tr>
                  <td><span class="order-id">ORD-{{ s.order?.id || s.id }}</span></td>
                  <td><span class="badge badge-secondary">{{ s.warehouse || '—' }}</span></td>
                  <td>{{ s.mode || '—' }}</td>
                  <td>
                    <div style="display:flex; align-items:center; gap:8px">
                      <span class="badge" [class]="'badge-' + getStatusClass(s.status)">{{ s.status || '—' }}</span>
                      @if (canManageShipments()) {
                        <select class="form-select status-select" [value]="s.status" (change)="updateShipmentStatus(s, $any($event.target).value)">
                          <option value="Pending">Beklemede</option>
                          <option value="Shipped">Kargoya Verildi</option>
                          <option value="In Transit">Yolda</option>
                          <option value="Delivered">Teslim Edildi</option>
                          <option value="Cancelled">İptal</option>
                        </select>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <app-pagination 
          [page]="currentPage()" 
          [size]="pageSize()" 
          [totalElements]="totalElements()" 
          [totalPages]="totalPages()"
          (pageChange)="onPageChange($event)">
        </app-pagination>
      }
    </div>
  `,
  styles: `
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .mini-stat { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 18px 20px; }
    .mini-label { display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 6px; }
    .mini-value { display: block; font-size: 1.375rem; font-weight: 700; letter-spacing: -0.02em; }
    .order-id { font-weight: 600; color: var(--primary); font-size: 0.8125rem; }
    @media (max-width: 768px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
  `
})
export class ShipmentsComponent implements OnInit {
  shipments = signal<Shipment[]>([]);
  loading = signal(true);
  deliveredCount = signal(0);
  inTransitCount = signal(0);
  warehouseCount = signal(0);

  // Pagination
  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);
  totalPages = signal(0);

  canManageShipments = computed(() => {
    const role = this.auth.userRole();
    return role === 'ADMIN' || role === 'CORPORATE';
  });

  constructor(private api: ApiService, private toast: ToastService, private auth: AuthService) {}

  ngOnInit(): void {
    this.fetchShipments();
  }

  fetchShipments(): void {
    this.loading.set(true);
    this.api.getPage<Shipment>('shipments', this.currentPage(), this.pageSize()).subscribe({
      next: (res) => {
        this.shipments.set(res.content);
        this.totalElements.set(res.totalElements);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
        
        // Mocking stats for now based on current page or hardcoded
        this.deliveredCount.set(Math.round(res.totalElements * 0.4));
        this.inTransitCount.set(Math.round(res.totalElements * 0.3));
        this.warehouseCount.set(5); // Mocked
      },
      error: () => this.loading.set(false)
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.fetchShipments();
  }

  updateShipmentStatus(shipment: Shipment, newStatus: string): void {
    this.api.patch('shipments', shipment.id, { status: newStatus }).subscribe({
      next: () => {
        this.toast.success('Kargo durumu güncellendi.');
        this.fetchShipments();
      },
      error: () => this.toast.error('Güncelleme başarısız.')
    });
  }

  getStatusClass(status: string | null | undefined): string {
    const s = status?.toLowerCase() || '';
    if (s.includes('deliver')) return 'success';
    if (s.includes('ship') || s.includes('transit')) return 'warning';
    return 'secondary';
  }
}
