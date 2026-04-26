import { Component, signal, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Review } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reviews',
  imports: [PaginationComponent],
  template: `
    <div class="reviews-page fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Yorumlar</h1>
          <p class="page-subtitle">Toplam {{ totalElements() }} değerlendirme</p>
        </div>
      </div>

      <!-- Stats section remains the same but counts might be partial unless we fetch all -->
      <div class="review-stats">
        <div class="overall-rating card">
          <div class="rating-big">{{ avgRating().toFixed(1) }}</div>
          <div class="stars-row">
            @for (s of [1,2,3,4,5]; track s) {
              <svg width="20" height="20" viewBox="0 0 24 24" [attr.fill]="s <= Math.round(avgRating()) ? '#f59e0b' : 'none'" [attr.stroke]="s <= Math.round(avgRating()) ? '#f59e0b' : '#cbd5e1'" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            }
          </div>
          <span class="rating-count">{{ totalElements() }} değerlendirme</span>
        </div>
        <div class="rating-bars card">
          @for (bar of ratingBars(); track bar.stars) {
            <div class="rating-bar-row">
              <span class="bar-label">{{ bar.stars }} ⭐</span>
              <div class="bar-track"><div class="bar-fill" [style.width]="bar.percent + '%'"></div></div>
              <span class="bar-count">{{ bar.count }}</span>
            </div>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="card" style="text-align:center;padding:40px"><p style="color:var(--text-muted)">Yükleniyor...</p></div>
      } @else {
        <div class="card" style="padding:0;overflow:hidden">
          <table class="data-table">
            <thead>
              <tr>
                <th>Müşteri</th>
                <th>Ürün</th>
                <th>Puan</th>
                <th>Duygu</th>
                <th>Faydalı Oy</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (review of reviews(); track review.id) {
                <tr>
                  <td class="font-medium">{{ getUserName(review) }}</td>
                  <td>{{ getProductName(review) }}</td>
                  <td>
                    <div class="star-cell">
                      @for (s of [1,2,3,4,5]; track s) {
                        <svg width="12" height="12" viewBox="0 0 24 24" [attr.fill]="s <= review.starRating ? '#f59e0b' : '#e2e8f0'" stroke="none">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      }
                    </div>
                  </td>
                  <td>
                    <span class="badge" [class]="getSentimentClass(review.sentiment)">{{ review.sentiment || '—' }}</span>
                  </td>
                  <td class="text-muted">{{ review.helpfulnessVotes || 0 }}</td>
                  <td>
                    @if (canDeleteReviews()) {
                      <button class="btn-icon-sm text-danger" (click)="deleteReview(review.id)">🗑</button>
                    }
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
    .review-stats { display: grid; grid-template-columns: 240px 1fr; gap: 16px; margin-bottom: 24px; }
    .overall-rating { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .rating-big { font-size: 3rem; font-weight: 800; letter-spacing: -0.04em; color: var(--text-primary); }
    .stars-row { display: flex; gap: 2px; margin: 8px 0; }
    .rating-count { font-size: 0.8125rem; color: var(--text-muted); }
    .rating-bars { display: flex; flex-direction: column; gap: 10px; justify-content: center; }
    .rating-bar-row { display: flex; align-items: center; gap: 12px; }
    .bar-label { font-size: 0.8125rem; font-weight: 500; width: 40px; }
    .bar-track { flex: 1; height: 8px; background: var(--gray-100); border-radius: var(--radius-full); overflow: hidden; }
    .bar-fill { height: 100%; background: #f59e0b; border-radius: var(--radius-full); transition: width 0.5s ease; }
    .bar-count { font-size: 0.75rem; color: var(--text-muted); width: 40px; text-align: right; }
    .star-cell { display: flex; gap: 1px; }
    .font-medium { font-weight: 500; }
    .text-muted { color: var(--text-muted); }
    @media (max-width: 768px) { .review-stats { grid-template-columns: 1fr; } }
  `
})
export class ReviewsComponent implements OnInit {
  reviews = signal<Review[]>([]);
  loading = signal(true);
  ratingBars = signal<{stars: number; percent: number; count: number}[]>([]);
  avgRating = signal(0);
  Math = Math;

  // Pagination
  currentPage = signal(0);
  pageSize = signal(30);
  totalElements = signal(0);
  totalPages = signal(0);
  canDeleteReviews = signal(false);

  constructor(private api: ApiService, private toast: ToastService, private auth: AuthService) {}

  ngOnInit(): void {
    this.canDeleteReviews.set(this.auth.userRole() === 'ADMIN');
    this.fetchReviews();
  }

  fetchReviews(): void {
    this.loading.set(true);
    this.api.getPage<Review>('reviews', this.currentPage(), this.pageSize()).subscribe({
      next: (res) => {
        this.reviews.set(res.content);
        this.totalElements.set(res.totalElements);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);

        this.updateReviewStats();
      },
      error: () => this.loading.set(false)
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.fetchReviews();
  }

  private updateReviewStats(): void {
    this.api.getAll<Review>('reviews').subscribe(allReviews => {
      const total = allReviews.length;
      const average = total > 0
        ? allReviews.reduce((sum, review) => sum + (review.starRating || 0), 0) / total
        : 0;

      this.avgRating.set(average);
      this.ratingBars.set([5, 4, 3, 2, 1].map(stars => {
        const count = allReviews.filter(review => review.starRating === stars).length;
        return {
          stars,
          count,
          percent: total > 0 ? Math.round((count / total) * 100) : 0
        };
      }));
    });
  }

  deleteReview(id: number): void {
    if (confirm('Bu yorumu silmek istediğinize emin misiniz?')) {
      this.api.delete('reviews', id).subscribe({
        next: () => {
          this.toast.success('Yorum silindi.');
          this.fetchReviews();
        },
        error: () => this.toast.error('Yorum silinemedi.')
      });
    }
  }

  getUserName(review: Review): string {
    return review.user?.email?.split('@')[0] ?? '—';
  }

  getProductName(review: Review): string {
    return review.product?.name || review.product?.description || '—';
  }

  getSentimentClass(sentiment: string | null | undefined): string {
    const s = sentiment?.toLowerCase() || '';
    if (s.includes('positive') || s.includes('olumlu')) return 'badge-success';
    if (s.includes('negative') || s.includes('olumsuz')) return 'badge-danger';
    return 'badge-secondary';
  }
}
