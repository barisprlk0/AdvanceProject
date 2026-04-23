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
      { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
      { label: 'Ürünler', icon: 'products', route: '/products' },
      { label: 'Siparişler', icon: 'orders', route: '/orders' },
      { label: 'Kargolar', icon: 'shipments', route: '/shipments', roles: ['ADMIN', 'CORPORATE'] },
      { label: 'Yorumlar', icon: 'reviews', route: '/reviews' },
      { label: 'Analitik', icon: 'analytics', route: '/analytics' },
      { label: 'AI Asistan', icon: 'chatbot', route: '/chatbot' },
      { label: 'Mağazalar', icon: 'stores', route: '/stores', roles: ['ADMIN'] },
      { label: 'Kullanıcılar', icon: 'users', route: '/users', roles: ['ADMIN'] },
      { label: 'Kategoriler', icon: 'categories', route: '/categories', roles: ['ADMIN'] },
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
