import { Component, signal, OnInit, computed } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Shipment } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-shipments',
  template: `
    <div class="shipments-page fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Kargolar</h1>
          <p class="page-subtitle">Toplam {{ shipments().length }} kargo kaydi</p>
        </div>
      </div>

      <div class="stats-row">
        <div class="mini-stat"><span class="mini-label">Toplam Kargo</span><span class="mini-value">{{ shipments().length }}</span></div>
        <div class="mini-stat"><span class="mini-label">Teslim Edildi</span><span class="mini-value">{{ deliveredCount() }}</span></div>
        <div class="mini-stat"><span class="mini-label">Yolda</span><span class="mini-value">{{ inTransitCount() }}</span></div>
        <div class="mini-stat"><span class="mini-label">Depo Sayisi</span><span class="mini-value">{{ warehouseCount() }}</span></div>
      </div>

      @if (loading()) {
        <div class="card" style="text-align:center;padding:40px"><p style="color:var(--text-muted)">Yukleniyor...</p></div>
      } @else {
        <div class="card" style="padding:0;overflow:hidden">
          <table class="data-table">
            <thead>
              <tr>
                <th>Siparis</th>
                <th>Depo</th>
                <th>Gonderim Turu</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              @for (s of shipments(); track s.id) {
                <tr>
                  <td><span class="order-id">ORD-{{ s.order?.id || s.id }}</span></td>
                  <td><span class="badge badge-secondary">{{ s.warehouse || '-' }}</span></td>
                  <td>{{ s.mode || '-' }}</td>
                  <td>
                    <div style="display:flex; align-items:center; gap:8px">
                      <span class="badge" [class]="'badge-' + getStatusClass(s.status)">{{ getStatusLabel(s.status) }}</span>
                      @if (canManageShipments()) {
                        <select class="form-select status-select" [value]="s.status || 'Pending'" (change)="updateShipmentStatus(s, $any($event.target).value)">
                          <option value="Pending">Beklemede</option>
                          <option value="Shipped">Kargoya Verildi</option>
                          <option value="In Transit">Yolda</option>
                          <option value="Delivered">Teslim Edildi</option>
                          <option value="Cancelled">Iptal</option>
                        </select>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
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
    this.api.getAll<Shipment>('shipments').subscribe({
      next: (data) => {
        this.shipments.set(data || []);
        this.loading.set(false);
        this.updateStats(data || []);
      },
      error: () => this.loading.set(false)
    });
  }

  updateShipmentStatus(shipment: Shipment, newStatus: string): void {
    this.api.patch('shipments', shipment.id, { status: newStatus }).subscribe({
      next: () => {
        this.toast.success('Kargo durumu guncellendi.');
        this.shipments.update(list => list.map(s => s.id === shipment.id ? { ...s, status: newStatus } : s));
        this.updateStats(this.shipments());
      },
      error: () => this.toast.error('Guncelleme basarisiz.')
    });
  }

  getStatusLabel(status: string | null | undefined): string {
    const s = (status || '').toLowerCase();
    if (s.includes('deliver') || s.includes('teslim')) return 'Teslim Edildi';
    if (s.includes('ship') || s.includes('transit') || s.includes('yolda') || s.includes('kargo')) return 'Yolda';
    if (s.includes('cancel') || s.includes('iptal')) return 'Iptal';
    return 'Beklemede';
  }

  getStatusClass(status: string | null | undefined): string {
    const s = (status || '').toLowerCase();
    if (s.includes('deliver') || s.includes('teslim')) return 'success';
    if (s.includes('ship') || s.includes('transit') || s.includes('yolda') || s.includes('kargo')) return 'warning';
    if (s.includes('cancel') || s.includes('iptal')) return 'danger';
    return 'secondary';
  }

  private updateStats(data: Shipment[]): void {
    this.deliveredCount.set(data.filter(s => {
      const x = (s.status || '').toLowerCase();
      return x.includes('deliver') || x.includes('teslim');
    }).length);

    this.inTransitCount.set(data.filter(s => {
      const x = (s.status || '').toLowerCase();
      return x.includes('ship') || x.includes('transit') || x.includes('yolda') || x.includes('kargo');
    }).length);

    this.warehouseCount.set(new Set(data.map(s => s.warehouse).filter(Boolean)).size);
  }
}
