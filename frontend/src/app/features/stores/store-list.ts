import { Component, signal, OnInit, computed } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Store, User } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-store-list',
  imports: [SkeletonComponent, FormsModule],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Mağaza Yönetimi</h1>
          <p class="page-subtitle">@if (isAdmin()) { Platformdaki tüm mağazaları yönetin } @else { Mağazalarınızı yönetin }</p>
        </div>
        <button class="btn btn-primary btn-sm" (click)="showForm.set(true)">Yeni Mağaza</button>
      </div>

      @if (showForm()) {
        <div class="card" style="margin-bottom:24px; padding:24px; animation: slideDown 0.3s ease">
          <h3 style="margin-bottom:16px">Yeni Mağaza Ekle</h3>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; align-items:flex-end">
            <div class="form-group"><label class="form-label">Mağaza Adı</label><input class="form-input" [(ngModel)]="newStore.name" placeholder="Mağaza adını girin"></div>
            
            @if (isAdmin()) {
              <div class="form-group">
                <label class="form-label">Sahibi (Admin Yetkisi)</label>
                <select class="form-select" [(ngModel)]="selectedOwnerId">
                  @for (u of users(); track u.id) {
                    <option [value]="u.id">{{ u.email }}</option>
                  }
                </select>
              </div>
            } @else {
              <div class="form-group">
                <label class="form-label">Sahibi</label>
                <input class="form-input" [value]="auth.displayName()" disabled>
              </div>
            }

            <div style="display:flex; gap:8px">
              <button class="btn btn-primary" (click)="addStore()">Kaydet</button>
              <button class="btn btn-secondary" (click)="showForm.set(false)">İptal</button>
            </div>
          </div>
        </div>
      }

      @if (loading()) {
        <div class="store-grid">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="card"><app-skeleton height="120px" /></div>
          }
        </div>
      } @else {
        <div class="store-grid">
          @for (store of stores(); track store.id) {
            <div class="store-card card">
              <div class="store-header">
                <div class="store-icon" [style.background]="'hsl('+store.id*53%360+',45%,90%)'">
                  <span [style.color]="'hsl('+store.id*53%360+',55%,40%)'">{{ (store.name || '?').charAt(0) }}</span>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px">
                   <span class="badge" [class]="store.status === 'Active' ? 'badge-success' : 'badge-danger'">{{ store.status || '—' }}</span>
                   @if (isAdmin() || store.owner.id === auth.userId()) {
                     <select class="form-select select-xs" [value]="store.status" (change)="updateStatus(store, $any($event.target).value)">
                       <option value="Active">Aktif</option>
                       <option value="Inactive">Pasif</option>
                     </select>
                   }
                </div>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center">
                <div>
                  <h4 class="store-name">{{ store.name || '—' }}</h4>
                  <p class="store-owner">{{ store.owner.email || '—' }}</p>
                </div>
                @if (isAdmin() || store.owner.id === auth.userId()) {
                  <button class="btn-icon-sm text-danger" (click)="deleteStore(store.id)">🗑</button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .store-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
    .store-card{transition:all var(--transition)}.store-card:hover{box-shadow:var(--shadow-md);transform:translateY(-2px)}
    .store-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
    .store-icon{width:44px;height:44px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;font-size:1.25rem;font-weight:700}
    .store-name{font-size:1rem;font-weight:600;margin-bottom:4px}
    .store-owner{font-size:.8125rem;color:var(--text-muted);margin-bottom:0}
    .select-xs { padding: 2px 4px; font-size: 0.7rem; width: 80px; }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  `
})
export class StoreListComponent implements OnInit {
  stores = signal<Store[]>([]);
  users = signal<User[]>([]);
  loading = signal(true);
  showForm = signal(false);

  newStore: any = { name: '', status: 'Active' };
  selectedOwnerId: number | null = null;

  isAdmin = computed(() => this.auth.hasRole('ADMIN'));

  constructor(private api: ApiService, private toast: ToastService, public auth: AuthService) {}

  ngOnInit(): void {
    this.fetchStores();
    if (this.isAdmin()) {
      this.api.getAll<User>('users').subscribe(data => this.users.set(data));
    }
  }

  fetchStores(): void {
    this.loading.set(true);
    this.api.getAll<Store>('stores').subscribe({
      next: (data) => { this.stores.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  addStore(): void {
    const ownerId = this.isAdmin() ? this.selectedOwnerId : this.auth.userId();
    
    if (!this.newStore.name || !ownerId) {
      this.toast.warning('Lütfen mağaza adını girin.');
      return;
    }

    this.api.create<Store>('stores', { 
      ...this.newStore, 
      owner: { id: ownerId } 
    }).subscribe({
      next: () => {
        this.toast.success('Mağaza başarıyla açıldı.');
        this.showForm.set(false);
        this.newStore.name = '';
        this.fetchStores();
      },
      error: () => this.toast.error('Mağaza açılırken hata oluştu.')
    });
  }

  updateStatus(store: Store, status: string): void {
    this.api.patch('stores', store.id, { status }).subscribe({
      next: () => {
        this.toast.success('Durum güncellendi.');
        this.fetchStores();
      },
      error: () => this.toast.error('Güncelleme başarısız.')
    });
  }

  deleteStore(id: number): void {
    if (confirm('Bu mağazayı silmek istediğinize emin misiniz?')) {
      this.api.delete('stores', id).subscribe({
        next: () => {
          this.toast.success('Mağaza silindi.');
          this.fetchStores();
        },
        error: () => this.toast.error('Mağaza silinemedi (ürünlerle bağlı olabilir).')
      });
    }
  }
}
