import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Auth routes (Login & Register)
  {
    path: '',
    loadComponent: () => import('./layouts/auth-layout/auth-layout').then(m => m.AuthLayoutComponent),
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./features/auth/register/register').then(m => m.RegisterComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  // Main app routes
  {
    path: 'app',
    loadComponent: () => import('./layouts/main-layout/main-layout').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent) },
      { path: 'orders', loadComponent: () => import('./features/orders/order-list/order-list').then(m => m.OrderListComponent) },
      { path: 'orders/:id', loadComponent: () => import('./features/orders/order-detail/order-detail').then(m => m.OrderDetailComponent) },
      { path: 'products', loadComponent: () => import('./features/products/product-list/product-list').then(m => m.ProductListComponent) },
      { path: 'products/:id', loadComponent: () => import('./features/products/product-detail/product-detail').then(m => m.ProductDetailComponent) },
      { path: 'reviews', loadComponent: () => import('./features/reviews/reviews').then(m => m.ReviewsComponent), canActivate: [roleGuard], data: { roles: ['ADMIN', 'CORPORATE'] } },
      { path: 'shipments', loadComponent: () => import('./features/shipments/shipments').then(m => m.ShipmentsComponent) },
      { path: 'cart', loadComponent: () => import('./features/cart/cart').then(m => m.CartComponent) },
      { path: 'checkout', loadComponent: () => import('./features/checkout/checkout').then(m => m.CheckoutComponent) },
      { path: 'analytics', loadComponent: () => import('./features/analytics/analytics').then(m => m.AnalyticsComponent), canActivate: [roleGuard], data: { roles: ['ADMIN', 'CORPORATE'] } },
      { path: 'chatbot', loadComponent: () => import('./features/chatbot/chatbot').then(m => m.ChatbotComponent) },
      { path: 'profile', loadComponent: () => import('./features/profile/profile').then(m => m.ProfileComponent) },

      // Admin routes
      {
        path: 'users',
        loadComponent: () => import('./features/users/user-list').then(m => m.UserListComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
      },
      {
        path: 'stores',
        loadComponent: () => import('./features/stores/store-list').then(m => m.StoreListComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'CORPORATE'] }
      },
      {
        path: 'categories',
        loadComponent: () => import('./features/categories/categories').then(m => m.CategoriesComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Final redirects
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'app/dashboard' },
];
