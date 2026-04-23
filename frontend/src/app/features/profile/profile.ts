import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  imports: [FormsModule],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">Profil Ayarları</h1>
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
            <div class="info-row"><span class="info-label">Cinsiyet</span><span>{{ auth.user()?.gender || '—' }}</span></div>
          </div>
        </div>
        <div class="profile-forms">
          <div class="card">
            <h3 class="card-title" style="margin-bottom:20px">Hesap Bilgileri</h3>
            <div class="form-group"><label class="form-label">E-posta</label><input class="form-input" [value]="auth.user()?.email||''"></div>
            <button class="btn btn-primary">Değişiklikleri Kaydet</button>
          </div>
          <div class="card">
            <h3 class="card-title" style="margin-bottom:20px">Şifre Değiştir</h3>
            <div class="form-group"><label class="form-label">Mevcut Şifre</label><input class="form-input" type="password" placeholder="••••••••"></div>
            <div class="form-group"><label class="form-label">Yeni Şifre</label><input class="form-input" type="password" placeholder="••••••••"></div>
            <div class="form-group"><label class="form-label">Yeni Şifre (Tekrar)</label><input class="form-input" type="password" placeholder="••••••••"></div>
            <button class="btn btn-primary">Şifreyi Güncelle</button>
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
  constructor(public auth: AuthService) {}
}
