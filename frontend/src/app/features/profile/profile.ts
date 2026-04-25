import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-profile',
  imports: [FormsModule],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">Profil Ayarlari</h1>
      </div>
      <div class="profile-layout">
        <div class="card profile-card">
          <div class="avatar-section">
            <div class="profile-avatar" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">
              {{ auth.displayName().charAt(0).toUpperCase() }}
            </div>
            <h3>{{ auth.displayName() }}</h3>
            <span class="profile-role badge badge-primary">{{ auth.userRole() }}</span>
          </div>
          <div class="divider"></div>
          <div class="profile-info">
            <div class="info-row"><span class="info-label">E-posta</span><span>{{ auth.user()?.email }}</span></div>
            <div class="info-row"><span class="info-label">Rol</span><span>{{ auth.user()?.roleType }}</span></div>
            <div class="info-row"><span class="info-label">Cinsiyet</span><span>{{ auth.user()?.gender || '-' }}</span></div>
          </div>
        </div>
        <div class="profile-forms">
          <div class="card">
            <h3 class="card-title" style="margin-bottom:20px">Hesap Bilgileri</h3>
            <div class="form-group">
              <label class="form-label">E-posta</label>
              <input class="form-input" [(ngModel)]="email" placeholder="ornek@mail.com">
            </div>
            <div class="form-group">
              <label class="form-label">Cinsiyet</label>
              <select class="form-select" [(ngModel)]="gender">
                <option value="Male">Erkek</option>
                <option value="Female">Kadin</option>
                <option value="Other">Diger</option>
              </select>
            </div>
            <button class="btn btn-primary" (click)="saveProfile()" [disabled]="isLoading()">
              @if (isLoading()) { <span class="spinner spinner-sm"></span> Kaydediliyor... } @else { Degisiklikleri Kaydet }
            </button>
          </div>
          <div class="card">
            <h3 class="card-title" style="margin-bottom:20px">Sifre Degistir</h3>
            <div class="form-group">
              <label class="form-label">Mevcut Sifre</label>
              <input class="form-input" type="password" [(ngModel)]="currentPassword" placeholder="********">
            </div>
            <div class="form-group">
              <label class="form-label">Yeni Sifre</label>
              <input class="form-input" type="password" [(ngModel)]="newPassword" placeholder="********">
            </div>
            <button class="btn btn-primary" (click)="updatePassword()" [disabled]="isChangingPassword()">
              @if (isChangingPassword()) { Guncelleniyor... } @else { Sifreyi Guncelle }
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .profile-layout{display:grid;grid-template-columns:300px 1fr;gap:24px}
    .profile-card{text-align:center}
    .avatar-section{padding:10px 0 20px}
    .profile-avatar{width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:2rem;font-weight:700;margin:0 auto 16px}
    .profile-card h3{font-size:1.125rem;margin-bottom:6px}
    .profile-role{display:inline-block}
    .profile-info{padding-top:4px}
    .info-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-light);font-size:.8125rem}
    .info-row:last-child{border-bottom:none}
    .info-label{color:var(--text-muted)}
    .profile-forms{display:flex;flex-direction:column;gap:20px}
    @media(max-width:768px){.profile-layout{grid-template-columns:1fr}}
  `
})
export class ProfileComponent {
  email = '';
  gender = '';
  isLoading = signal(false);

  currentPassword = '';
  newPassword = '';
  isChangingPassword = signal(false);

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private toast: ToastService
  ) {
    const user = this.auth.user();
    if (user) {
      this.email = user.email;
      this.gender = user.gender || '';
    }
  }

  saveProfile(): void {
    const user = this.auth.user();
    if (!user) return;

    this.isLoading.set(true);
    this.api.patchEndpoint('users/profile', {
      email: this.email,
      gender: this.gender
    }).subscribe({
      next: (updatedUser: any) => {
        this.isLoading.set(false);
        this.toast.success('Profil basariyla guncellendi.');
        this.auth.updateCurrentUser(updatedUser);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Guncelleme sirasinda bir hata olustu.');
      }
    });
  }

  updatePassword(): void {
    if (!this.currentPassword.trim() || !this.newPassword.trim()) {
      this.toast.warning('Mevcut ve yeni sifre alanlari zorunludur.');
      return;
    }
    if (this.newPassword.trim().length < 6) {
      this.toast.warning('Yeni sifre en az 6 karakter olmalidir.');
      return;
    }

    this.isChangingPassword.set(true);
    this.api.postEndpoint<void>('users/profile/change-password', {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.isChangingPassword.set(false);
        this.currentPassword = '';
        this.newPassword = '';
        this.toast.success('Sifre basariyla guncellendi.');
      },
      error: (err) => {
        this.isChangingPassword.set(false);
        this.toast.error(err?.error?.message || 'Sifre guncellenemedi.');
      }
    });
  }
}
