import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-system-settings',
  imports: [FormsModule],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Sistem Ayarlari</h1>
          <p class="page-subtitle">Platform konfigrasyon degerlerini yonetin</p>
        </div>
      </div>

      <div class="card" style="max-width:760px">
        <div class="form-group">
          <label class="form-label">Bakim Modu</label>
          <select class="form-select" [(ngModel)]="maintenanceMode">
            <option [ngValue]="false">Kapali</option>
            <option [ngValue]="true">Acik</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Kurumsal Magaza Acabilir</label>
          <select class="form-select" [(ngModel)]="allowCorporateStoreCreation">
            <option [ngValue]="true">Evet</option>
            <option [ngValue]="false">Hayir</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Magaza Basina Maksimum Urun</label>
          <input class="form-input" type="number" min="1" [(ngModel)]="maxProductsPerStore">
        </div>

        <div class="form-group">
          <label class="form-label">Varsayilan Para Birimi</label>
          <input class="form-input" [(ngModel)]="defaultCurrency">
        </div>

        <div class="form-group">
          <label class="form-label">Dusuk Stok Esigi</label>
          <input class="form-input" type="number" min="1" [(ngModel)]="lowStockThreshold">
        </div>

        <button class="btn btn-primary" (click)="save()">Kaydet</button>
      </div>
    </div>
  `
})
export class SystemSettingsComponent implements OnInit {
  maintenanceMode = false;
  allowCorporateStoreCreation = true;
  maxProductsPerStore = 5000;
  defaultCurrency = 'TRY';
  lowStockThreshold = 10;

  loading = signal(false);

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void {
    this.api.getEndpoint<any>('system-settings').subscribe({
      next: (res) => {
        this.maintenanceMode = !!res?.maintenanceMode;
        this.allowCorporateStoreCreation = !!res?.allowCorporateStoreCreation;
        this.maxProductsPerStore = Number(res?.maxProductsPerStore || 5000);
        this.defaultCurrency = String(res?.defaultCurrency || 'TRY');
        this.lowStockThreshold = Number(res?.lowStockThreshold || 10);
      },
      error: () => this.toast.error('Sistem ayarlari yuklenemedi.')
    });
  }

  save(): void {
    this.loading.set(true);
    this.api.patchEndpoint<any>('system-settings', {
      maintenanceMode: this.maintenanceMode,
      allowCorporateStoreCreation: this.allowCorporateStoreCreation,
      maxProductsPerStore: this.maxProductsPerStore,
      defaultCurrency: this.defaultCurrency,
      lowStockThreshold: this.lowStockThreshold
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Sistem ayarlari guncellendi.');
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Sistem ayarlari kaydedilemedi.');
      }
    });
  }
}
