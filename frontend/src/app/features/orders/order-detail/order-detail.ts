import { Component, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Order } from '../../../core/models';
import { DatePipe, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-order-detail',
  imports: [RouterLink, DatePipe, CurrencyPipe],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <div class="header-with-back">
          <button class="btn btn-ghost btn-icon" routerLink="/orders">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div>
            <h1 class="page-title">Sipariş #{{ orderId }}</h1>
            <p class="page-subtitle">Sipariş detayları ve ürün listesi</p>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="card" style="text-align:center;padding:60px"><span class="spinner"></span></div>
      } @else if (order()) {
        <div class="order-layout">
          <div class="order-main">
            <div class="card">
              <h3 class="card-title" style="margin-bottom:20px">Ürünler</h3>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Fiyat</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of order()?.items; track item.id) {
                    <tr>
                      <td>
                        <div style="display:flex; align-items:center; gap:12px">
                          <div class="product-mini-img" [style.background]="'hsl(' + (item.product?.id || 0) * 37 % 360 + ', 40%, 92%)'">
                            {{ item.product?.name?.charAt(0) }}
                          </div>
                          <div>
                            <div style="font-weight:600">{{ item.product?.name }}</div>
                            <div class="text-xs text-muted">Miktar: {{ item.quantity }}</div>
                          </div>
                        </div>
                      </td>
                      <td>{{ item.price | currency:'TRY':'symbol':'1.2-2':'tr-TR' }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="2" style="text-align:center;padding:20px;color:var(--text-muted)">Bu siparişte ürün bulunamadı.</td></tr>
                  }
                </tbody>
              </table>
              <div class="order-summary-box">
                <div class="summary-line"><span>Ara Toplam</span><span>{{ order()?.grandTotal | currency:'TRY':'symbol':'1.2-2':'tr-TR' }}</span></div>
                <div class="summary-line"><span>KDV (%20)</span><span>₺0.00</span></div>
                <div class="summary-line total"><span>Toplam</span><span>{{ order()?.grandTotal | currency:'TRY':'symbol':'1.2-2':'tr-TR' }}</span></div>
              </div>
            </div>
          </div>
          <div class="order-sidebar">
            <div class="card">
              <h3 class="card-title">Müşteri Bilgileri</h3>
              <div class="info-list">
                <div class="info-item"><label>E-posta</label><span>{{ order()?.user?.email }}</span></div>
                <div class="info-item"><label>Cinsiyet</label><span>{{ order()?.user?.gender || '—' }}</span></div>
              </div>
            </div>
            <div class="card">
              <h3 class="card-title">Sipariş Durumu</h3>
              <div class="status-box">
                <span class="badge" [class]="'badge-' + getStatusClass(order()?.status)">{{ order()?.status }}</span>
                <p class="text-muted text-sm" style="margin-top:8px">Son Güncelleme: {{ order()?.orderDate | date:'dd.MM.yyyy HH:mm' }}</p>
              </div>
            </div>
            <div class="card">
              <h3 class="card-title">Ödeme Bilgisi</h3>
              <div class="info-list">
                <div class="info-item"><label>Yöntem</label><span>{{ order()?.paymentMethod }}</span></div>
                <div class="info-item"><label>Mağaza</label><span>{{ order()?.store?.name }}</span></div>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <div class="card" style="text-align:center;padding:60px"><p>Sipariş bulunamadı.</p></div>
      }
    </div>
  `,
  styles: `
    .header-with-back { display: flex; align-items: center; gap: 16px; }
    .order-layout { display: grid; grid-template-columns: 1fr 320px; gap: 24px; }
    .order-summary-box { margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 12px; align-items: flex-end; }
    .product-mini-img { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--text-primary); flex-shrink: 0; }
    .text-xs { font-size: 0.75rem; }
    .summary-line { display: flex; justify-content: space-between; width: 240px; font-size: 0.9375rem; }
    .summary-line.total { font-weight: 700; color: var(--text-primary); font-size: 1.125rem; margin-top: 8px; }
    .info-list { display: flex; flex-direction: column; gap: 14px; margin-top: 16px; }
    .info-item label { display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; }
    .info-item span { font-weight: 500; font-size: 0.875rem; }
    @media (max-width: 1024px) { .order-layout { grid-template-columns: 1fr; } }
  `
})
export class OrderDetailComponent implements OnInit {
  orderId: string = '';
  order = signal<Order | null>(null);
  loading = signal(true);

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    if (this.orderId) {
      this.api.getById<Order>('orders', this.orderId).subscribe({
        next: (data) => {
          this.order.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    }
  }

  getStatusClass(status: string | null | undefined): string {
    const s = status?.toLowerCase() || '';
    if (s.includes('deliver')) return 'success';
    if (s.includes('ship') || s.includes('transit')) return 'warning';
    if (s.includes('cancel')) return 'danger';
    return 'primary';
  }
}
