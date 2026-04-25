import { Component, signal, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Category } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-categories',
  imports: [SkeletonComponent, FormsModule],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Kategori Yönetimi</h1>
          <p class="page-subtitle">Ürün kategorilerini düzenleyin</p>
        </div>
        <div style="display:flex; gap:10px">
          <input type="text" class="form-input" placeholder="Yeni kategori adı..." [(ngModel)]="newCatName" style="width:200px">
          <button class="btn btn-primary btn-sm" (click)="addCategory()" [disabled]="!newCatName.trim()">Ekle</button>
        </div>
      </div>

      @if (loading()) {
        <div class="cat-grid">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="card"><app-skeleton height="80px" /></div>
          }
        </div>
      } @else {
        <div class="cat-grid">
          @for (cat of categories(); track cat.id) {
            <div class="cat-card card">
              <div class="cat-content">
                <div class="cat-icon" [style.background]="'hsl('+cat.id*67%360+',45%,92%)'">
                  <span [style.color]="'hsl('+cat.id*67%360+',55%,40%)'">{{ (cat.name || '?').charAt(0) }}</span>
                </div>
                <div class="cat-info">
                  <h4 class="cat-name">{{ cat.name }}</h4>
                  <span class="cat-parent">ID: #{{ cat.id }}</span>
                </div>
              </div>
              <button class="btn-icon-sm text-danger" (click)="deleteCategory(cat.id)">🗑</button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
    .cat-card{display:flex;align-items:center;justify-content:space-between;padding:16px;transition:all var(--transition)}
    .cat-card:hover{box-shadow:var(--shadow-md);transform:translateY(-2px)}
    .cat-content{display:flex;align-items:center;gap:12px}
    .cat-icon{width:40px;height:40px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;font-size:1.125rem;font-weight:700}
    .cat-name{font-size:.9375rem;font-weight:600;margin-bottom:2px}
    .cat-parent{font-size:.75rem;color:var(--text-muted)}
  `
})
export class CategoriesComponent implements OnInit {
  categories = signal<Category[]>([]);
  loading = signal(true);
  newCatName = '';

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void {
    this.fetchCategories();
  }

  fetchCategories(): void {
    this.loading.set(true);
    this.api.getAll<Category>('categories').subscribe({
      next: (data) => { this.categories.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  addCategory(): void {
    this.api.create<Category>('categories', { name: this.newCatName }).subscribe({
      next: () => {
        this.toast.success('Kategori eklendi.');
        this.newCatName = '';
        this.fetchCategories();
      },
      error: () => this.toast.error('Hata oluştu.')
    });
  }

  deleteCategory(id: number): void {
    if (confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) {
      this.api.delete('categories', id).subscribe({
        next: () => {
          this.toast.success('Kategori silindi.');
          this.fetchCategories();
        },
        error: () => this.toast.error('Kategori silinemedi (ürünlerle bağlı olabilir).')
      });
    }
  }
}
