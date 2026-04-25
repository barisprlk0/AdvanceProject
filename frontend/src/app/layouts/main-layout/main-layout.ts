import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar';
import { HeaderComponent } from '../../shared/components/header/header';
import { signal } from '@angular/core';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <div class="layout">
      @if (isNavigating()) {
        <div class="global-loader"></div>
      }
      <app-sidebar />
      <div class="layout-content">
        <app-header />
        <main class="main-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    .layout { display: flex; min-height: 100vh; position: relative; }
    .layout-content { flex: 1; margin-left: var(--sidebar-width); display: flex; flex-direction: column; transition: margin-left var(--transition-slow); }
    .main-content { flex: 1; padding: 28px 32px; animation: fadeIn 0.3s ease; }
    .global-loader { position: fixed; top: 0; left: 0; right: 0; height: 3px; background: var(--primary); z-index: 10001; animation: loading-progress 2s ease infinite; transform-origin: 0% 50%; }
    @keyframes loading-progress { 0% { transform: scaleX(0); } 50% { transform: scaleX(0.5); } 100% { transform: scaleX(1); } }
  `
})
export class MainLayoutComponent {
  isNavigating = signal(false);
  private router = inject(Router);

  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) this.isNavigating.set(true);
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        setTimeout(() => this.isNavigating.set(false), 200);
      }
    });
  }
}
