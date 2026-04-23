import { Component, signal, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Store } from '../../core/models';

@Component({
  selector: 'app-store-list',
  template: `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Mağaza Yönetimi</h1>
          <p class="page-subtitle">Toplam {{ stores().length }} mağaza</p>
        </div>
      </div>
      @if (loading()) {
        <div class="card" style="text-align:center;padding:40px"><p style="color:var(--text-muted)">Yükleniyor...</p></div>
      } @else {
        <div class="store-grid">
          @for (store of stores(); track store.id) {
            <div class="store-card card">
              <div class="store-header">
                <div class="store-icon" [style.background]="'hsl('+store.id*53%360+',45%,90%)'">
                  <span [style.color]="'hsl('+store.id*53%360+',55%,40%)'">{{ (store.name || '?').charAt(0) }}</span>
                </div>
                <span class="badge" [class]="store.status === 'Active' ? 'badge-success' : 'badge-danger'">{{ store.status || '—' }}</span>
              </div>
              <h4 class="store-name">{{ store.name || '—' }}</h4>
              <p class="store-owner">{{ store.owner?.email || '—' }}</p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .store-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
    .store-card{transition:all var(--transition)}.store-card:hover{box-shadow:var(--shadow-md);transform:translateY(-2px)}
    .store-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
    .store-icon{width:44px;height:44px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;font-size:1.25rem;font-weight:700}
    .store-name{font-size:1rem;font-weight:600;margin-bottom:4px}
    .store-owner{font-size:.8125rem;color:var(--text-muted);margin-bottom:0}
  `
})
export class StoreListComponent implements OnInit {
  stores = signal<Store[]>([]);
  loading = signal(true);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getAll<Store>('stores').subscribe({
      next: (data) => { this.stores.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
