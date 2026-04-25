import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent {
  collapsed = signal(false);

  constructor(public auth: AuthService, private router: Router) {}

  readonly navItems = computed<NavItem[]>(() => {
    const role = this.auth.userRole();
    const all: NavItem[] = [
      { label: 'Dashboard', icon: 'dashboard', route: '/app/dashboard' },
      { label: 'Ürünler', icon: 'products', route: '/app/products' },
      { label: 'Siparişler', icon: 'orders', route: '/app/orders' },
      { label: 'Kargolar', icon: 'shipments', route: '/app/shipments' },
      { label: 'Yorumlar', icon: 'reviews', route: '/app/reviews', roles: ['ADMIN', 'CORPORATE'] },
      { label: 'Analitik', icon: 'analytics', route: '/app/analytics', roles: ['ADMIN', 'CORPORATE'] },
      { label: 'AI Asistan', icon: 'chatbot', route: '/app/chatbot' },
      { label: 'Mağazalar', icon: 'stores', route: '/app/stores', roles: ['ADMIN', 'CORPORATE'] },
      { label: 'Kullanıcılar', icon: 'users', route: '/app/users', roles: ['ADMIN'] },
      { label: 'Kategoriler', icon: 'categories', route: '/app/categories', roles: ['ADMIN'] },
    ];

    return all.filter(item => {
      if (!item.roles) return true;
      return role ? item.roles.includes(role) : false;
    });
  });

  toggleCollapse(): void {
    this.collapsed.update(v => !v);
  }

  logout(): void {
    this.auth.logout();
  }
}
