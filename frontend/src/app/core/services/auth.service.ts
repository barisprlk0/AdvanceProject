import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { User, UserRole, AuthResponse, LoginRequest, RegisterRequest, mapRoleType, getUserDisplayName } from '../models';
import { firstValueFrom, map, Observable, tap, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUser = signal<User | null>(this.loadUserFromStorage());
  private readonly token = signal<string | null>(this.loadTokenFromStorage());
  private readonly refreshToken = signal<string | null>(this.loadRefreshTokenFromStorage());

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

  private loadRefreshTokenFromStorage(): string | null {
    const token = localStorage.getItem('sl_refresh_token');
    if (!token || token === 'null' || token === 'undefined') return null;
    return token;
  }

  getToken(): string | null {
    return this.token();
  }

  getRefreshToken(): string | null {
    return this.refreshToken();
  }

  private setAuthSession(authResp: AuthResponse): void {
    localStorage.setItem('sl_token', authResp.token);
    this.token.set(authResp.token);

    if (authResp.refreshToken) {
      localStorage.setItem('sl_refresh_token', authResp.refreshToken);
      this.refreshToken.set(authResp.refreshToken);
    } else {
      localStorage.removeItem('sl_refresh_token');
      this.refreshToken.set(null);
    }

    const user: User = {
      id: authResp.id,
      email: authResp.email,
      roleType: authResp.roleType,
      gender: authResp.gender
    };

    localStorage.setItem('sl_user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  async login(request: LoginRequest): Promise<boolean> {
    try {
      const authResp = await firstValueFrom(
        this.http.post<AuthResponse>('/api/auth/login', request)
      );
      this.setAuthSession(authResp);
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
      this.setAuthSession(authResp);
      return true;
    } catch (err: any) {
      console.error('Backend register failed:', err);
      throw err;
    }
  }

  refreshAccessToken(): Observable<string> {
    const refresh = this.getRefreshToken();
    if (!refresh) {
      return throwError(() => new Error('Refresh token not found'));
    }

    return this.http.post<AuthResponse>('/api/auth/refresh', { refreshToken: refresh }).pipe(
      tap((resp) => this.setAuthSession(resp)),
      map((resp) => resp.token)
    );
  }

  updateCurrentUser(user: User): void {
    localStorage.setItem('sl_user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  logout(): void {
    localStorage.removeItem('sl_token');
    localStorage.removeItem('sl_refresh_token');
    localStorage.removeItem('sl_user');
    this.token.set(null);
    this.refreshToken.set(null);
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

}
