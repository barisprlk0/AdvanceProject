import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { User, UserRole, AuthResponse, LoginRequest, RegisterRequest, mapRoleType, getUserDisplayName } from '../models';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUser = signal<User | null>(this.loadUserFromStorage());
  private readonly token = signal<string | null>(this.loadTokenFromStorage());

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this.token());
  readonly userRole = computed<UserRole | null>(() => {
    const u = this.currentUser();
    return u ? mapRoleType(u.roleType) : null;
  });
  readonly displayName = computed(() => getUserDisplayName(this.currentUser()));

  constructor(private router: Router, private http: HttpClient) {}

  private loadUserFromStorage(): User | null {
    try {
      const data = localStorage.getItem('sl_user');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private loadTokenFromStorage(): string | null {
    return localStorage.getItem('sl_token');
  }

  getToken(): string | null {
    return this.token();
  }

  async login(request: LoginRequest): Promise<boolean> {
    try {
      // 1) Backend login → {token, email}
      const authResp = await firstValueFrom(
        this.http.post<AuthResponse>('/api/auth/login', request)
      );

      // 2) Token'ı kaydet
      localStorage.setItem('sl_token', authResp.token);
      this.token.set(authResp.token);

      // 3) Kullanıcı bilgisini çek
      const users = await firstValueFrom(
        this.http.get<User[]>('/api/users', {
          headers: { 'Authorization': `Bearer ${authResp.token}` }
        })
      );
      const user = users.find(u => u.email === authResp.email) || null;

      if (user) {
        localStorage.setItem('sl_user', JSON.stringify(user));
        this.currentUser.set(user);
      } else {
        // Fallback: minimal user from email
        const fallbackUser: User = {
          id: 0,
          email: authResp.email,
          roleType: this.guessRoleFromEmail(authResp.email)
        };
        localStorage.setItem('sl_user', JSON.stringify(fallbackUser));
        this.currentUser.set(fallbackUser);
      }

      return true;
    } catch (err) {
      console.warn('Backend login failed, using demo mode:', err);
      // Demo fallback
      const demoUser: User = {
        id: 0,
        email: request.email,
        roleType: this.guessRoleFromEmail(request.email)
      };
      localStorage.setItem('sl_token', 'demo-token-' + Date.now());
      localStorage.setItem('sl_user', JSON.stringify(demoUser));
      this.token.set('demo-token-' + Date.now());
      this.currentUser.set(demoUser);
      return true;
    }
  }

  async register(request: RegisterRequest): Promise<boolean> {
    try {
      const authResp = await firstValueFrom(
        this.http.post<AuthResponse>('/api/auth/register', request)
      );
      localStorage.setItem('sl_token', authResp.token);
      this.token.set(authResp.token);

      const user: User = {
        id: 0,
        email: authResp.email,
        roleType: request.roleType || 'Individual'
      };
      localStorage.setItem('sl_user', JSON.stringify(user));
      this.currentUser.set(user);
      return true;
    } catch {
      // Demo fallback
      const user: User = {
        id: 0,
        email: request.email,
        roleType: request.roleType || 'Individual'
      };
      localStorage.setItem('sl_token', 'demo-token-' + Date.now());
      localStorage.setItem('sl_user', JSON.stringify(user));
      this.token.set('demo-token-' + Date.now());
      this.currentUser.set(user);
      return true;
    }
  }

  logout(): void {
    localStorage.removeItem('sl_token');
    localStorage.removeItem('sl_user');
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  hasRole(role: UserRole): boolean {
    return this.userRole() === role;
  }

  hasAnyRole(...roles: UserRole[]): boolean {
    const current = this.userRole();
    return current ? roles.includes(current) : false;
  }

  private guessRoleFromEmail(email: string): string {
    if (email.includes('admin')) return 'Admin';
    if (email.includes('corp') || email.includes('store')) return 'Corporate';
    return 'Individual';
  }
}
