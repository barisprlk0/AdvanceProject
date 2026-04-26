import { Component, Input, Output, EventEmitter, computed } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    <div class="pagination-wrapper">
      <div class="pagination-info">
        Toplam <strong>{{ totalElements }}</strong> kayıttan {{ start }} - {{ end }} arası gösteriliyor
      </div>
      <div class="pagination-controls">
        <button class="btn-page" [disabled]="page === 0" (click)="changePage(page - 1)">←</button>
        
        @for (p of pages(); track p) {
          @if (p === -1) {
            <span class="page-dots">...</span>
          } @else {
            <button class="btn-page" [class.active]="p === page" (click)="changePage(p)">{{ p + 1 }}</button>
          }
        }

        <button class="btn-page" [disabled]="page >= totalPages - 1" (click)="changePage(page + 1)">→</button>
      </div>
    </div>
  `,
  styles: `
    .pagination-wrapper { display: flex; align-items: center; justify-content: space-between; padding: 20px 0; margin-top: 10px; }
    .pagination-info { font-size: 0.8125rem; color: var(--text-muted); }
    .pagination-controls { display: flex; align-items: center; gap: 6px; }
    .btn-page { min-width: 32px; height: 32px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: white; font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
    .btn-page:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
    .btn-page.active { background: var(--primary); border-color: var(--primary); color: white; }
    .btn-page:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-dots { padding: 0 4px; color: var(--text-muted); }
  `
})
export class PaginationComponent {
  @Input() page = 0;
  @Input() size = 10;
  @Input() totalElements = 0;
  @Input() totalPages = 0;
  @Output() pageChange = new EventEmitter<number>();

  get start() { return this.page * this.size + 1; }
  get end() { return Math.min((this.page + 1) * this.size, this.totalElements); }

  pages = computed(() => {
    const total = this.totalPages;
    const current = this.page;
    const res: number[] = [];

    if (total <= 7) {
      for (let i = 0; i < total; i++) res.push(i);
    } else {
      res.push(0);
      if (current > 2) res.push(-1); // dots
      
      const start = Math.max(1, current - 1);
      const end = Math.min(total - 2, current + 1);
      
      for (let i = start; i <= end; i++) res.push(i);
      
      if (current < total - 3) res.push(-1); // dots
      res.push(total - 1);
    }
    return res;
  });

  changePage(p: number) {
    if (p >= 0 && p < this.totalPages) {
      this.pageChange.emit(p);
    }
  }
}
