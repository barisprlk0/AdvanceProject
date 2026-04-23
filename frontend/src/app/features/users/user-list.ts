import { Component, signal, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { User, mapRoleType } from '../../core/models';

@Component({
  selector: 'app-user-list',
  template: `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Kullanıcı Yönetimi</h1>
          <p class="page-subtitle">Toplam {{ users().length }} kullanıcı</p>
        </div>
      </div>
      @if (loading()) {
        <div class="card" style="text-align:center;padding:40px"><p style="color:var(--text-muted)">Yükleniyor...</p></div>
      } @else {
        <div class="card" style="padding:0;overflow:hidden">
          <table class="data-table">
            <thead><tr><th>Kullanıcı</th><th>Rol</th><th>Cinsiyet</th></tr></thead>
            <tbody>
              @for (u of users(); track u.id) {
                <tr>
                  <td><strong>{{ u.email }}</strong></td>
                  <td><span class="badge" [class]="'badge-' + getRoleClass(u.roleType)">{{ u.roleType }}</span></td>
                  <td class="text-muted">{{ u.gender || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: `.text-muted{color:var(--text-muted)}`
})
export class UserListComponent implements OnInit {
  users = signal<User[]>([]);
  loading = signal(true);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getAll<User>('users').subscribe({
      next: (data) => { this.users.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  getRoleClass(roleType: string): string {
    const r = mapRoleType(roleType);
    if (r === 'ADMIN') return 'warning';
    if (r === 'CORPORATE') return 'secondary';
    return 'primary';
  }
}
