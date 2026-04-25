import { Component, signal, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { Product, Category, Store } from '../../../core/models';

@Component({
  selector: 'app-product-form',
  imports: [FormsModule],
  template: `
    <div class="modal-overlay" (click)="cancel.emit()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">{{ product ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle' }}</h2>
          <button class="btn-close" (click)="cancel.emit()">×</button>
        </div>
        <div class="modal-body">
          <form #form="ngForm" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label class="form-label">Ürün Adı / Açıklama</label>
              <input class="form-input" name="name" [(ngModel)]="formData.name" required placeholder="Örn: Akıllı Saat Pro">
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">Fiyat (₺)</label>
                <input class="form-input" name="price" type="number" [(ngModel)]="formData.unitPrice" required>
              </div>
              <div class="form-group">
                <label class="form-label">SKU</label>
                <input class="form-input" name="sku" [(ngModel)]="formData.sku" required placeholder="Örn: WATCH-001">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Kategori</label>
              <select class="form-select" name="category" [(ngModel)]="selectedCategoryId" required>
                @for (cat of categories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.name }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Mağaza</label>
              <select class="form-select" name="store" [(ngModel)]="selectedStoreId" required>
                @for (st of stores(); track st.id) {
                  <option [value]="st.id">{{ st.name }}</option>
                }
              </select>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="cancel.emit()">İptal</button>
              <button type="submit" class="btn btn-primary" [disabled]="isLoading() || !form.valid">
                @if (isLoading()) { <span class="spinner spinner-sm"></span> }
                {{ product ? 'Güncelle' : 'Kaydet' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: `
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
    .modal-card { background: white; border-radius: var(--radius-lg); width: 100%; max-width: 500px; box-shadow: var(--shadow-xl); overflow: hidden; animation: zoomIn 0.2s ease-out; }
    .modal-header { padding: 20px 24px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; }
    .modal-title { font-size: 1.125rem; font-weight: 700; margin: 0; }
    .btn-close { background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; }
    .modal-body { padding: 24px; }
    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .modal-footer { padding-top: 24px; display: flex; justify-content: flex-end; gap: 12px; }
    @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  `
})
export class ProductFormComponent implements OnInit {
  @Input() product: Product | null = null;
  @Output() save = new EventEmitter<Product>();
  @Output() cancel = new EventEmitter<void>();

  categories = signal<Category[]>([]);
  stores = signal<Store[]>([]);
  isLoading = signal(false);

  formData: Partial<Product> = {};
  selectedCategoryId: number | null = null;
  selectedStoreId: number | null = null;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void {
    // Load dropdown data
    this.api.getAll<Category>('categories').subscribe(data => this.categories.set(data));
    this.api.getAll<Store>('stores').subscribe(data => this.stores.set(data));

    if (this.product) {
      this.formData = { ...this.product };
      this.selectedCategoryId = this.product.category?.id || null;
      this.selectedStoreId = this.product.store?.id || null;
    }
  }

  onSubmit(): void {
    this.isLoading.set(true);
    
    const body = {
      ...this.formData,
      category: { id: this.selectedCategoryId },
      store: { id: this.selectedStoreId }
    };

    const request = this.product 
      ? this.api.update<Product>('products', this.product.id, body)
      : this.api.create<Product>('products', body);

    request.subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.toast.success(this.product ? 'Ürün güncellendi.' : 'Yeni ürün eklendi.');
        this.save.emit(res);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('İşlem başarısız oldu.');
      }
    });
  }
}
