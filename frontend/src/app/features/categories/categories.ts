import { Component, signal, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Category } from '../../core/models';

@Component({
  selector: 'app-categories',
  template: `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Kategori Yönetimi</h1>
          <p class="page-subtitle">Toplam {{ categories().length }} kategori</p>
        </div>
        <button class="btn btn-primary btn-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Yeni Kategori
        </button>
      </div>
      @if (loading()) {
        <div class="card" style="text-align:center;padding:40px"><p style="color:var(--text-muted)">Yükleniyor...</p></div>
      } @else {
        <div class="cat-grid">
          @for (cat of categories(); track cat.id; let i = $index) {
            <div class="cat-card card" [style.animation-delay]="(i*40)+'ms'">
              <div class="cat-icon" [style.background]="'hsl('+cat.id*67%360+',45%,92%)'">
                <span [style.color]="'hsl('+cat.id*67%360+',55%,40%)'">{{ (cat.name || '?').charAt(0) }}</span>
              </div>
              <h4 class="cat-name">{{ cat.name }}</h4>
              @if (cat.parent) {
                <span class="cat-parent">Alt kategori: {{ cat.parent.name }}</span>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
    .cat-card{text-align:center;transition:all var(--transition);animation:fadeIn .4s ease both}
    .cat-card:hover{box-shadow:var(--shadow-md);transform:translateY(-3px)}
    .cat-icon{width:52px;height:52px;border-radius:var(--radius-lg);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:700}
    .cat-name{font-size:.9375rem;font-weight:600;margin-bottom:4px}
    .cat-parent{font-size:.75rem;color:var(--text-muted)}
  `
})
export class CategoriesComponent implements OnInit {
  categories = signal<Category[]>([]);
  loading = signal(true);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getAll<Category>('categories').subscribe({
      next: (data) => { this.categories.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
