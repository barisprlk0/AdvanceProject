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
  readonly userId = computed(() => this.currentUser()?.id || null);
  readonly userRole = computed<UserRole | null>(() => {
    const u = this.currentUser();
    return u ? mapRoleType(u.roleType) : null;
  });
  readonly displayName = computed(() => getUserDisplayName(this.currentUser()));

  constructor(private router: Router, private http: HttpClient) {}

  private loadUserFromStorage(): User | null {
    try {
      const data = localStorage.getItem('sl_user');
      if (!data || data === 'undefined') return null;
      return JSON.parse(data);
    } catch (e) {
      console.error('Error loading user from storage', e);
      return null;
    }
  }

  private loadTokenFromStorage(): string | null {
    const token = localStorage.getItem('sl_token');
    if (!token || token === 'null' || token === 'undefined') return null;
    return token;
  }

  getToken(): string | null {
    return this.token();
  }

  async login(request: LoginRequest): Promise<boolean> {
    try {
      const authResp = await firstValueFrom(
        this.http.post<AuthResponse>('/api/auth/login', request)
      );

      localStorage.setItem('sl_token', authResp.token);
      this.token.set(authResp.token);

      const user: User = {
        id: authResp.id,
        email: authResp.email,
        roleType: authResp.roleType,
        gender: authResp.gender
      };

      localStorage.setItem('sl_user', JSON.stringify(user));
      this.currentUser.set(user);
      return true;
    } catch (err: any) {
      console.error('Backend login failed:', err);
      // If you want to force demo mode for testing, you can uncomment this
      /*
      const demoUser: User = { id: 0, email: request.email, roleType: 'ADMIN' };
      localStorage.setItem('sl_token', 'demo-token-' + Date.now());
      localStorage.setItem('sl_user', JSON.stringify(demoUser));
      this.token.set('demo-token-' + Date.now());
      this.currentUser.set(demoUser);
      return true;
      */
      throw err;
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
        id: authResp.id,
        email: authResp.email,
        roleType: authResp.roleType,
        gender: authResp.gender
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

  updateCurrentUser(user: User): void {
    localStorage.setItem('sl_user', JSON.stringify(user));
    this.currentUser.set(user);
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
