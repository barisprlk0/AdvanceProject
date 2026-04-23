import { Component, signal, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { User, mapRoleType } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton';

@Component({
  selector: 'app-user-list',
  imports: [SkeletonComponent],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Kullanıcı Yönetimi</h1>
          <p class="page-subtitle">Platformdaki tüm kullanıcıları yönetin</p>
        </div>
      </div>

      @if (loading()) {
        <div class="card" style="padding:0;overflow:hidden">
          <table class="data-table">
            <thead><tr><th>Kullanıcı</th><th>Rol</th><th>Cinsiyet</th><th>İşlemler</th></tr></thead>
            <tbody>
              @for (i of [1,2,3,4,5]; track i) {
                <tr>
                  <td><app-skeleton width="180px" /></td>
                  <td><app-skeleton width="80px" /></td>
                  <td><app-skeleton width="60px" /></td>
                  <td><app-skeleton width="100px" /></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="card" style="padding:0;overflow:hidden">
          <table class="data-table">
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>Rol</th>
                <th>Cinsiyet</th>
                <th>Rolü Güncelle</th>
              </tr>
            </thead>
            <tbody>
              @for (u of users(); track u.id) {
                <tr>
                  <td>
                    <div style="display:flex; align-items:center; gap:12px">
                      <div class="user-avatar" [style.background]="'hsl('+u.id*43%360+',45%,90%)'">
                        <span [style.color]="'hsl('+u.id*43%360+',55%,40%)'">{{ u.email.charAt(0).toUpperCase() }}</span>
                      </div>
                      <strong>{{ u.email }}</strong>
                    </div>
                  </td>
                  <td><span class="badge" [class]="'badge-' + getRoleClass(u.roleType)">{{ u.roleType }}</span></td>
                  <td class="text-muted">{{ u.gender || '—' }}</td>
                  <td>
                    <select class="form-select select-sm" [value]="u.roleType" (change)="updateRole(u, $any($event.target).value)">
                      <option value="INDIVIDUAL">Bireysel</option>
                      <option value="CORPORATE">Kurumsal</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: `
    .user-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8125rem; }
    .select-sm { padding: 4px 8px; font-size: 0.75rem; width: 120px; }
    .text-muted { color: var(--text-muted); }
  `
})
export class UserListComponent implements OnInit {
  users = signal<User[]>([]);
  loading = signal(true);

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void {
    this.fetchUsers();
  }

  fetchUsers(): void {
    this.loading.set(true);
    this.api.getAll<User>('users').subscribe({
      next: (data) => { this.users.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  updateRole(user: User, newRole: string): void {
    this.api.patch('users', user.id, { roleType: newRole }).subscribe({
      next: () => {
        this.toast.success(`${user.email} rolü güncellendi.`);
        this.fetchUsers();
      },
      error: () => this.toast.error('Güncelleme başarısız.')
    });
  }

  getRoleClass(roleType: string): string {
    const r = mapRoleType(roleType);
    if (r === 'ADMIN') return 'warning';
    if (r === 'CORPORATE') return 'secondary';
    return 'primary';
  }
}
