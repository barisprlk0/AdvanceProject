import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Product, Review } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, CurrencyPipe, FormsModule],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <div class="header-with-back">
          <button class="btn btn-ghost btn-icon" routerLink="/app/products">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div>
            <h1 class="page-title">{{ product()?.name || 'Ürün Detayı' }}</h1>
            <p class="page-subtitle">Ürün performansı, mağaza bilgisi ve yorumlar</p>
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
              <span class="badge badge-secondary" style="margin-bottom:12px">{{ product()?.category?.name || 'Kategori yok' }}</span>
              <h2 class="product-title">{{ product()?.name }}</h2>
              <p class="product-sku">SKU: {{ product()?.sku }}</p>
              <div class="product-price-box">
                <span class="price-label">Birim Fiyat</span>
                <span class="price-value">{{ product()?.unitPrice | currency:'TRY':'symbol':'1.2-2':'tr-TR' }}</span>
              </div>
              <p class="product-desc">{{ product()?.description || 'Açıklama bulunmuyor.' }}</p>

              @if (isIndividual()) {
                <div class="product-actions">
                  <button class="btn btn-primary btn-lg order-button" (click)="placeOrder()" [disabled]="orderLoading()">
                    @if (orderLoading()) {
                      <span class="spinner spinner-sm"></span> İşleniyor...
                    } @else {
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
                <div class="store-icon">{{ product()?.store?.name?.charAt(0) || '?' }}</div>
                <div>
                  <div class="store-name">{{ product()?.store?.name || '-' }}</div>
                  <div class="store-status badge badge-success">{{ product()?.store?.status || '-' }}</div>
                </div>
              </div>
            </div>
            <div class="card">
              <h3 class="card-title">Yorum Özeti</h3>
              <div class="rating-summary">
                <strong>{{ averageRating().toFixed(1) }}</strong>
                <div class="stars-line">{{ starText(Math.round(averageRating())) }}</div>
                <span>{{ reviews().length }} yorum</span>
              </div>
            </div>
          </div>
        </div>

        <div class="reviews-grid">
          <section class="card">
            <div class="review-header">
              <div>
                <h3 class="card-title">Ürün Yorumları</h3>
                <p class="card-subtitle">{{ reviews().length }} değerlendirme</p>
              </div>
            </div>

            @if (reviewsLoading()) {
              <p class="muted">Yükleniyor...</p>
            } @else {
              <div class="review-list">
                @for (review of reviews(); track review.id) {
                  <article class="review-item">
                    <div class="review-topline">
                      <div>
                        <strong>{{ getUserName(review) }}</strong>
                        <span>{{ starText(review.starRating) }}</span>
                      </div>
                      <span class="helpful">{{ review.helpfulnessVotes || 0 }} faydalı oy</span>
                    </div>
                    <p>{{ review.sentiment || 'Yorum metni yok.' }}</p>
                  </article>
                } @empty {
                  <div class="empty-reviews">Henüz yorum yok.</div>
                }
              </div>
            }
          </section>

          @if (isIndividual()) {
            <aside class="card review-form-card">
              <h3 class="card-title">Yorum Yap</h3>
              <div class="rating-picker">
                @for (star of [1,2,3,4,5]; track star) {
                  <button type="button" class="star-button" [class.active]="star <= selectedRating()" (click)="selectedRating.set(star)">
                    ★
                  </button>
                }
              </div>
              <textarea
                class="form-input review-textarea"
                name="reviewText"
                [(ngModel)]="reviewText"
                rows="5"
                maxlength="50"
                placeholder="Ürün hakkındaki deneyiminizi yazın"></textarea>
              <button class="btn btn-primary submit-review" (click)="submitReview()" [disabled]="reviewSubmitting() || !canSubmitReview()">
                @if (reviewSubmitting()) {
                  <span class="spinner spinner-sm"></span> Kaydediliyor...
                } @else {
                  Yorumu Gönder
                }
              </button>
            </aside>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .header-with-back { display: flex; align-items: center; gap: 16px; }
    .product-detail-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 24px; }
    .product-info-card { display: flex; flex-direction: row; gap: 32px; padding: 32px; }
    .product-visual { width: 240px; flex-shrink: 0; }
    .product-placeholder-img { width: 100%; aspect-ratio: 1; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; }
    .product-main-details { flex: 1; min-width: 0; }
    .product-title { font-size: 1.75rem; font-weight: 700; margin-bottom: 8px; color: var(--text-primary); }
    .product-sku { color: var(--text-muted); font-size: 0.875rem; margin-bottom: 24px; }
    .product-price-box { background: var(--bg-surface); border: 1px solid var(--border-color); padding: 16px 20px; border-radius: var(--radius-md); display: inline-flex; flex-direction: column; gap: 4px; margin-bottom: 24px; }
    .price-label { font-size: 0.75rem; color: var(--text-muted); }
    .price-value { font-size: 1.5rem; font-weight: 700; color: var(--primary); }
    .product-desc { line-height: 1.6; color: var(--text-secondary); font-size: 0.9375rem; }
    .product-actions { margin-top: 32px; }
    .order-button { width: 100%; height: 54px; font-size: 1.05rem; }
    .product-meta-cards { display: flex; flex-direction: column; gap: 20px; }
    .store-info-box { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
    .store-icon { width: 40px; height: 40px; background: var(--primary-light); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; }
    .store-name { font-weight: 600; font-size: 0.9375rem; }
    .rating-summary { margin-top: 16px; display: flex; flex-direction: column; gap: 4px; }
    .rating-summary strong { font-size: 2rem; line-height: 1; }
    .stars-line { color: #f59e0b; letter-spacing: 2px; }
    .rating-summary span, .muted { color: var(--text-muted); font-size: 0.875rem; }
    .reviews-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 24px; margin-top: 24px; align-items: start; }
    .review-header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
    .review-list { display: flex; flex-direction: column; gap: 12px; }
    .review-item { border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 16px; background: var(--bg-surface); }
    .review-topline { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
    .review-topline strong, .review-topline span { display: block; }
    .review-topline span { color: #f59e0b; font-size: 0.875rem; margin-top: 3px; }
    .helpful { color: var(--text-muted) !important; font-size: 0.75rem !important; white-space: nowrap; }
    .review-item p { margin: 0; color: var(--text-secondary); line-height: 1.55; }
    .empty-reviews { text-align: center; padding: 34px; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: var(--radius-lg); }
    .review-form-card { display: flex; flex-direction: column; gap: 14px; }
    .rating-picker { display: flex; gap: 6px; }
    .star-button { font-size: 1.6rem; color: #cbd5e1; line-height: 1; transition: color var(--transition-fast), transform var(--transition-fast); }
    .star-button.active, .star-button:hover { color: #f59e0b; }
    .star-button:hover { transform: translateY(-1px); }
    .review-textarea { width: 100%; resize: vertical; min-height: 120px; }
    .submit-review { width: 100%; }
    @media (max-width: 992px) { .product-info-card { flex-direction: column; } .product-visual { width: 100%; } .product-detail-grid, .reviews-grid { grid-template-columns: 1fr; } }
  `
})
export class ProductDetailComponent implements OnInit {
  productId = '';
  product = signal<Product | null>(null);
  reviews = signal<Review[]>([]);
  loading = signal(true);
  reviewsLoading = signal(false);
  orderLoading = signal(false);
  reviewSubmitting = signal(false);
  selectedRating = signal(5);
  reviewText = '';
  Math = Math;

  isIndividual = computed(() => this.auth.hasRole('INDIVIDUAL'));
  averageRating = computed(() => {
    const list = this.reviews();
    if (!list.length) return 0;
    return list.reduce((sum, review) => sum + (review.starRating || 0), 0) / list.length;
  });

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
      this.fetchProduct();
      this.fetchReviews();
    }
  }

  fetchProduct(): void {
    this.api.getById<Product>('products', this.productId).subscribe({
      next: (data) => {
        this.product.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  fetchReviews(): void {
    this.reviewsLoading.set(true);
    this.api.getPage<Review>('reviews', 0, 20, { productId: this.productId }).subscribe({
      next: (res) => {
        this.reviews.set(res.content);
        this.reviewsLoading.set(false);
      },
      error: () => this.reviewsLoading.set(false)
    });
  }

  placeOrder(): void {
    const product = this.product();
    if (!product) return;

    this.orderLoading.set(true);
    const orderData = {
      orderDate: new Date().toISOString(),
      status: 'Pending',
      grandTotal: product.unitPrice,
      user: { id: this.auth.userId() },
      store: { id: product.store?.id },
      items: [{ product: { id: product.id }, quantity: 1, price: product.unitPrice }]
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

  submitReview(): void {
    const product = this.product();
    if (!product || !this.canSubmitReview()) return;

    this.reviewSubmitting.set(true);
    const reviewData = {
      product: { id: product.id },
      starRating: this.selectedRating(),
      helpfulnessVotes: 0,
      sentiment: this.reviewText.trim()
    };

    this.api.create<Review>('reviews', reviewData).subscribe({
      next: () => {
        this.reviewSubmitting.set(false);
        this.reviewText = '';
        this.selectedRating.set(5);
        this.toast.success('Yorumunuz kaydedildi.');
        this.fetchReviews();
      },
      error: () => {
        this.reviewSubmitting.set(false);
        this.toast.error('Yorum kaydedilemedi.');
      }
    });
  }

  canSubmitReview(): boolean {
    return this.selectedRating() >= 1 && this.selectedRating() <= 5 && this.reviewText.trim().length >= 3;
  }

  starText(rating: number | null | undefined): string {
    const value = Math.max(0, Math.min(5, Math.round(rating || 0)));
    return '★'.repeat(value) + '☆'.repeat(5 - value);
  }

  getUserName(review: Review): string {
    return review.user?.email?.split('@')[0] || 'Kullanıcı';
  }
}
