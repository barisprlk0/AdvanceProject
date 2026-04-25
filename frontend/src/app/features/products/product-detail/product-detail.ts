import { Component, signal, OnInit, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Product } from '../../../core/models';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, CurrencyPipe],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <div class="header-with-back">
          <button class="btn btn-ghost btn-icon" routerLink="/app/products">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div>
            <h1 class="page-title">{{ product()?.name || 'Ürün Detayı' }}</h1>
            <p class="page-subtitle">Ürün performansı ve stok bilgileri</p>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="card" style="text-align:center;padding:60px"><span class="spinner"></span></div>
      } @else if (product()) {
        <div class="product-detail-grid">
          <div class="card product-info-card">
            <div class="product-visual">
              <div class="product-placeholder-img" [style.background]="'hsl(' + (product()?.id || 0) * 47 % 360 + ', 40%, 95%)'">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" [style.color]="'hsl(' + (product()?.id || 0) * 47 % 360 + ', 50%, 40%)'">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
              </div>
            </div>
            <div class="product-main-details">
              <span class="badge badge-secondary" style="margin-bottom:12px">{{ product()?.category?.name }}</span>
              <h2 class="product-title">{{ product()?.name }}</h2>
              <p class="product-sku">SKU: {{ product()?.sku }}</p>
              <div class="product-price-box">
                <span class="price-label">Birim Fiyat</span>
                <span class="price-value">{{ product()?.unitPrice | currency:'TRY':'symbol':'1.2-2':'tr-TR' }}</span>
              </div>
              <p class="product-desc">{{ product()?.description }}</p>

              @if (isIndividual()) {
                <div class="product-actions" style="margin-top: 32px">
                  <button class="btn btn-primary btn-lg" style="width: 100%; height: 54px; font-size: 1.1rem" (click)="placeOrder()" [disabled]="orderLoading()">
                    @if (orderLoading()) {
                      <span class="spinner spinner-sm"></span> İşleniyor...
                    } @else {
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                      Hemen Sipariş Ver
                    }
                  </button>
                </div>
              }
            </div>
          </div>

          <div class="product-meta-cards">
            <div class="card">
              <h3 class="card-title">Mağaza Bilgisi</h3>
              <div class="store-info-box">
                <div class="store-icon">{{ product()?.store?.name?.charAt(0) }}</div>
                <div>
                  <div class="store-name">{{ product()?.store?.name }}</div>
                  <div class="store-status badge badge-success">{{ product()?.store?.status }}</div>
                </div>
              </div>
            </div>
            <div class="card">
              <h3 class="card-title">Performans Özeti</h3>
              <div class="perf-stats">
                <div class="perf-stat"><span class="label">Görüntülenme</span><span class="value">1,284</span></div>
                <div class="perf-stat"><span class="label">Satış Adedi</span><span class="value">156</span></div>
                <div class="perf-stat"><span class="label">Dönüşüm</span><span class="value">%12.1</span></div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .header-with-back { display: flex; align-items: center; gap: 16px; }
    .product-detail-grid { display: grid; grid-template-columns: 1fr 340px; gap: 24px; }
    .product-info-card { display: flex; flex-direction: row; gap: 32px; padding: 32px; }
    .product-visual { width: 240px; flex-shrink: 0; }
    .product-placeholder-img { width: 100%; aspect-ratio: 1; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; }
    .product-main-details { flex: 1; }
    .product-title { font-size: 1.75rem; font-weight: 700; margin-bottom: 8px; color: var(--text-primary); }
    .product-sku { color: var(--text-muted); font-size: 0.875rem; margin-bottom: 24px; }
    .product-price-box { background: var(--bg-surface); border: 1px solid var(--border-color); padding: 16px 20px; border-radius: var(--radius-md); display: inline-flex; flex-direction: column; gap: 4px; margin-bottom: 24px; }
    .price-label { font-size: 0.75rem; color: var(--text-muted); }
    .price-value { font-size: 1.5rem; font-weight: 700; color: var(--primary); }
    .product-desc { line-height: 1.6; color: var(--text-secondary); font-size: 0.9375rem; }
    .product-meta-cards { display: flex; flex-direction: column; gap: 20px; }
    .store-info-box { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
    .store-icon { width: 40px; height: 40px; background: var(--primary-light); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; }
    .store-name { font-weight: 600; font-size: 0.9375rem; }
    .perf-stats { display: flex; flex-direction: column; gap: 16px; margin-top: 20px; }
    .perf-stat { display: flex; justify-content: space-between; align-items: center; }
    .perf-stat .label { font-size: 0.8125rem; color: var(--text-muted); }
    .perf-stat .value { font-weight: 600; }
    @media (max-width: 992px) { .product-info-card { flex-direction: column; } .product-visual { width: 100%; } .product-detail-grid { grid-template-columns: 1fr; } }
  `
})
export class ProductDetailComponent implements OnInit {
  productId: string = '';
  product = signal<Product | null>(null);
  loading = signal(true);
  orderLoading = signal(false);

  isIndividual = computed(() => this.auth.hasRole('INDIVIDUAL'));

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private api: ApiService,
    private auth: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id') || '';
    if (this.productId) {
      this.api.getById<Product>('products', this.productId).subscribe({
        next: (data) => {
          this.product.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    }
  }

  placeOrder(): void {
    const product = this.product();
    if (!product) return;

    this.orderLoading.set(true);
    
    // Create a simple order
    const orderData = {
      orderDate: new Date().toISOString(),
      status: 'Pending',
      grandTotal: product.unitPrice,
      user: { id: this.auth.userId() },
      store: { id: product.store?.id },
      items: [
        {
          product: { id: product.id },
          quantity: 1,
          price: product.unitPrice
        }
      ]
    };

    this.api.create('orders', orderData).subscribe({
      next: () => {
        this.orderLoading.set(false);
        this.toast.success('Siparişiniz başarıyla oluşturuldu!');
        setTimeout(() => this.router.navigate(['/app/orders']), 1500);
      },
      error: () => {
        this.orderLoading.set(false);
        this.toast.error('Sipariş oluşturulurken bir hata oluştu.');
      }
    });
  }
}
