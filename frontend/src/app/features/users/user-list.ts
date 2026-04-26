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
                <th></th>
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
                      <option value="SUSPENDED">Askida</option>
                    </select>
                  </td>
                  <td>
                    <button class="btn-icon-sm text-danger" (click)="deleteUser(u.id)">🗑</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      
      <div class="pagination">
        <div class="pagination-info">
          Toplam <strong>{{ totalElements() }}</strong> kullanıcı (Sayfa {{ currentPage() + 1 }} / {{ totalPages() }})
        </div>
        <div class="pagination-actions">
          <button class="btn btn-secondary btn-sm" [disabled]="currentPage() === 0" (click)="changePage(currentPage() - 1)">Önceki</button>
          <button class="btn btn-secondary btn-sm" [disabled]="currentPage() >= totalPages() - 1" (click)="changePage(currentPage() + 1)">Sonraki</button>
        </div>
      </div>
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
  
  // Pagination
  currentPage = signal(0);
  pageSize = signal(30);
  totalElements = signal(0);
  totalPages = signal(0);

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void {
    this.fetchUsers();
  }

  fetchUsers(): void {
    this.loading.set(true);
    this.api.getPage<User>('users', this.currentPage(), this.pageSize()).subscribe({
      next: (res) => { 
        this.users.set(res.content); 
        this.totalElements.set(res.totalElements);
        this.totalPages.set(res.totalPages);
        this.loading.set(false); 
      },
      error: () => this.loading.set(false)
    });
  }

  changePage(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
      this.fetchUsers();
    }
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

  deleteUser(id: number): void {
    if (confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
      this.api.delete('users', id).subscribe({
        next: () => {
          this.toast.success('Kullanıcı silindi.');
          this.fetchUsers();
        },
        error: () => this.toast.error('Kullanıcı silinemedi.')
      });
    }
  }

  getRoleClass(roleType: string): string {
    if ((roleType || '').toUpperCase() === 'SUSPENDED') return 'danger';
    const r = mapRoleType(roleType);
    if (r === 'ADMIN') return 'warning';
    if (r === 'CORPORATE') return 'secondary';
    return 'primary';
  }
}
