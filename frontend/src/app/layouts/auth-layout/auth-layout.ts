import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  template: `
    <div class="auth-layout">
      <div class="auth-left">
        <div class="auth-brand">
          <div class="auth-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="8" rx="2" fill="#818cf8"/>
              <rect x="13" y="3" width="8" height="8" rx="2" fill="#6366f1" opacity="0.7"/>
              <rect x="3" y="13" width="8" height="8" rx="2" fill="#6366f1" opacity="0.7"/>
              <rect x="13" y="13" width="8" height="8" rx="2" fill="#4f46e5"/>
            </svg>
            <span class="brand-name">ShopLens</span>
          </div>
          <p class="brand-tagline">E-Commerce Analytics Platform</p>
        </div>
        <div class="auth-form-area">
          <router-outlet />
        </div>
        <div class="auth-footer">
          <span>© 2026 ShopLens. Tüm hakları saklıdır.</span>
        </div>
      </div>
      <div class="auth-right">
        <div class="auth-visual">
          <div class="visual-content">
            <div class="floating-card card-1">
              <div class="mini-chart">
                <div class="bar" style="height: 40%"></div>
                <div class="bar" style="height: 65%"></div>
                <div class="bar" style="height: 45%"></div>
                <div class="bar" style="height: 80%"></div>
                <div class="bar" style="height: 55%"></div>
                <div class="bar" style="height: 90%"></div>
                <div class="bar" style="height: 70%"></div>
              </div>
              <span class="card-label">Gelir Trendi</span>
              <span class="card-value">+24.5%</span>
            </div>
            <div class="floating-card card-2">
              <span class="card-label">Aktif Kullanıcı</span>
              <span class="card-value">12,847</span>
            </div>
            <div class="floating-card card-3">
              <span class="card-label">Bugünkü Sipariş</span>
              <span class="card-value">384</span>
            </div>
          </div>
          <div class="visual-bg-text">Analytics</div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .auth-layout {
      display: flex;
      min-height: 100vh;
    }

    .auth-left {
      flex: 0 0 520px;
      display: flex;
      flex-direction: column;
      padding: 40px 60px;
      background: var(--bg-surface);
    }

    .auth-brand {
      margin-bottom: 48px;
    }

    .auth-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .brand-name {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.03em;
    }

    .brand-tagline {
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .auth-form-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .auth-footer {
      font-size: 0.75rem;
      color: var(--text-muted);
      padding-top: 24px;
    }

    /* Right visual panel */
    .auth-right {
      flex: 1;
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .auth-visual {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .visual-bg-text {
      position: absolute;
      font-size: 12rem;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.03);
      letter-spacing: -0.05em;
      user-select: none;
    }

    .visual-content {
      position: relative;
      z-index: 1;
    }

    .floating-card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      padding: 20px 24px;
      color: white;
      position: absolute;
      animation: float 6s ease-in-out infinite;
    }

    .card-1 {
      top: 20%;
      left: 10%;
      animation-delay: 0s;
    }
    .card-2 {
      top: 45%;
      right: 15%;
      animation-delay: 2s;
    }
    .card-3 {
      bottom: 25%;
      left: 25%;
      animation-delay: 4s;
    }

    .card-label {
      display: block;
      font-size: 0.75rem;
      opacity: 0.7;
      margin-bottom: 4px;
    }
    .card-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .mini-chart {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      height: 48px;
      margin-bottom: 12px;
    }
    .mini-chart .bar {
      width: 8px;
      background: rgba(255, 255, 255, 0.4);
      border-radius: 2px;
      transition: height 0.5s ease;
    }
    .mini-chart .bar:nth-child(even) {
      background: rgba(129, 140, 248, 0.6);
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-12px); }
    }

    @media (max-width: 1024px) {
      .auth-right { display: none; }
      .auth-left {
        flex: 1;
        max-width: 100%;
        padding: 32px;
      }
    }
  `
})
export class AuthLayoutComponent {}
