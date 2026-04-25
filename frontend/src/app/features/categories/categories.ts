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
          <h1 class="page-title">Kategori Yonetimi</h1>
          <p class="page-subtitle">Kategori hiyerarsisini ve urun kategorilerini duzenleyin</p>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <h3 style="margin-bottom:12px">Yeni Kategori</h3>
        <div style="display:grid;grid-template-columns:1fr 240px auto;gap:10px;align-items:end">
          <div class="form-group">
            <label class="form-label">Kategori Adi</label>
            <input type="text" class="form-input" [(ngModel)]="newCatName" placeholder="Orn. Elektronik">
          </div>
          <div class="form-group">
            <label class="form-label">Ust Kategori</label>
            <select class="form-select" [(ngModel)]="newParentId">
              <option [ngValue]="null">Yok (root)</option>
              @for (cat of categories(); track cat.id) {
                <option [ngValue]="cat.id">{{ cat.name }}</option>
              }
            </select>
          </div>
          <button class="btn btn-primary btn-sm" (click)="addCategory()" [disabled]="!newCatName.trim()">Ekle</button>
        </div>
      </div>

      @if (loading()) {
        <div class="cat-grid">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="card"><app-skeleton height="96px" /></div>
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
                  <span class="cat-parent">Parent: {{ parentName(cat) }}</span>
                </div>
              </div>
              <div class="cat-actions">
                <select class="form-select select-xs" [value]="cat.parent?.id ?? ''" (change)="updateParent(cat, $any($event.target).value)">
                  <option value="">Root</option>
                  @for (candidate of categories(); track candidate.id) {
                    @if (candidate.id !== cat.id) {
                      <option [value]="candidate.id">{{ candidate.name }}</option>
                    }
                  }
                </select>
                <button class="btn-icon-sm text-danger" (click)="deleteCategory(cat.id)">🗑</button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
    .cat-card{display:flex;align-items:center;justify-content:space-between;padding:16px;transition:all var(--transition)}
    .cat-card:hover{box-shadow:var(--shadow-md);transform:translateY(-2px)}
    .cat-content{display:flex;align-items:center;gap:12px}
    .cat-icon{width:40px;height:40px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;font-size:1.125rem;font-weight:700}
    .cat-name{font-size:.9375rem;font-weight:600;margin-bottom:2px}
    .cat-parent{font-size:.75rem;color:var(--text-muted)}
    .cat-actions{display:flex;align-items:center;gap:8px}
    .select-xs{padding:4px 8px;font-size:.75rem;min-width:130px}
  `
})
export class CategoriesComponent implements OnInit {
  categories = signal<Category[]>([]);
  loading = signal(true);
  newCatName = '';
  newParentId: number | null = null;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void {
    this.fetchCategories();
  }

  fetchCategories(): void {
    this.loading.set(true);
    this.api.getAll<Category>('categories').subscribe({
      next: (data) => {
        this.categories.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  parentName(cat: Category): string {
    return cat.parent?.name || 'Root';
  }

  addCategory(): void {
    const payload: any = { name: this.newCatName.trim() };
    if (this.newParentId) {
      payload.parent = { id: this.newParentId };
    }
    this.api.create<Category>('categories', payload).subscribe({
      next: () => {
        this.toast.success('Kategori eklendi.');
        this.newCatName = '';
        this.newParentId = null;
        this.fetchCategories();
      },
      error: () => this.toast.error('Kategori eklenemedi.')
    });
  }

  updateParent(cat: Category, parentIdRaw: string): void {
    const parentId = parentIdRaw ? Number(parentIdRaw) : null;
    const payload: any = { name: cat.name, parent: parentId ? { id: parentId } : null };
    this.api.update<Category>('categories', cat.id, payload).subscribe({
      next: () => {
        this.toast.success('Kategori hiyerarsisi guncellendi.');
        this.fetchCategories();
      },
      error: () => this.toast.error('Kategori guncellenemedi.')
    });
  }

  deleteCategory(id: number): void {
    if (!confirm('Bu kategoriyi silmek istediginize emin misiniz?')) return;
    this.api.delete('categories', id).subscribe({
      next: () => {
        this.toast.success('Kategori silindi.');
        this.fetchCategories();
      },
      error: () => this.toast.error('Kategori silinemedi (urunlerle bagli olabilir).')
    });
  }
}
