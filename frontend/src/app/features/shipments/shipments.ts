import { Component, signal, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Shipment } from '../../core/models';

@Component({
  selector: 'app-shipments',
  template: `
    <div class="shipments-page fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Kargolar</h1>
          <p class="page-subtitle">Toplam {{ shipments().length }} kargo kaydı</p>
        </div>
      </div>

      <div class="stats-row">
        <div class="mini-stat"><span class="mini-label">Toplam Kargo</span><span class="mini-value">{{ shipments().length }}</span></div>
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
                  <td><span class="badge" [class]="'badge-' + getStatusClass(s.status)">{{ s.status || '—' }}</span></td>
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

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getAll<Shipment>('shipments').subscribe({
      next: (data) => {
        this.shipments.set(data);
        this.loading.set(false);
        this.deliveredCount.set(data.filter(s => s.status?.toLowerCase().includes('deliver')).length);
        this.inTransitCount.set(data.filter(s => s.status?.toLowerCase().includes('ship') || s.status?.toLowerCase().includes('transit')).length);
        this.warehouseCount.set(new Set(data.map(s => s.warehouse)).size);
      },
      error: () => this.loading.set(false)
    });
  }

  getStatusClass(status: string | null | undefined): string {
    const s = status?.toLowerCase() || '';
    if (s.includes('deliver')) return 'success';
    if (s.includes('ship') || s.includes('transit')) return 'warning';
    return 'secondary';
  }
}
