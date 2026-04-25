import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-audit-logs',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Audit Logs</h1>
          <p class="page-subtitle">Platform aktivitesini filtreleyip izleyin</p>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px;display:flex;gap:12px;align-items:end;flex-wrap:wrap">
        <div class="form-group">
          <label class="form-label">Aksiyon</label>
          <input class="form-input" [(ngModel)]="actionFilter" placeholder="ORDER_CREATED, REVIEW_HELPFUL...">
        </div>
        <div class="form-group">
          <label class="form-label">User ID</label>
          <input class="form-input" [(ngModel)]="userIdFilter" type="number" min="1" placeholder="Orn. 12">
        </div>
        <button class="btn btn-secondary btn-sm" (click)="load()">Filtrele</button>
        <button class="btn btn-secondary btn-sm" (click)="reset()">Temizle</button>
      </div>

      <div class="card" style="padding:0;overflow:hidden">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Zaman</th>
              <th>User</th>
              <th>Aksiyon</th>
              <th>Detay</th>
            </tr>
          </thead>
          <tbody>
            @for (row of logs(); track row.id) {
              <tr>
                <td>#{{ row.id }}</td>
                <td>{{ row.timestamp ? (row.timestamp | date:'dd.MM.yyyy HH:mm') : '-' }}</td>
                <td>{{ row.userEmail || ('#' + row.userId) || '-' }}</td>
                <td><span class="badge badge-secondary">{{ row.action || '-' }}</span></td>
                <td>{{ row.details || '-' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="text-muted">Kayit bulunamadi.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class AuditLogsComponent implements OnInit {
  logs = signal<any[]>([]);
  actionFilter = '';
  userIdFilter: number | null = null;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const params: Record<string, string | number> = { size: 100, sort: 'timestamp,desc' };
    if (this.actionFilter.trim()) params['action'] = this.actionFilter.trim();
    if (this.userIdFilter) params['userId'] = this.userIdFilter;

    this.api.getEndpoint<any>('audit-logs', params).subscribe({
      next: (res) => this.logs.set(res?.content || []),
      error: () => this.toast.error('Audit loglari yuklenemedi.')
    });
  }

  reset(): void {
    this.actionFilter = '';
    this.userIdFilter = null;
    this.load();
  }
}
