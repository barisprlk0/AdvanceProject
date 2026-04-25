import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

const withAuthHeader = (req: HttpRequest<unknown>, token: string) =>
  req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const authReq = token ? withAuthHeader(req, token) : req;
  const isRefreshCall = req.url.includes('/api/auth/refresh');

  return next(authReq).pipe(
    catchError(error => {
      if (error.status !== 401 || isRefreshCall) {
        if (error.status === 401) {
          authService.logout();
        }
        return throwError(() => error);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        refreshTokenSubject.next(null);

        return authService.refreshAccessToken().pipe(
          switchMap((newToken: string) => {
            isRefreshing = false;
            refreshTokenSubject.next(newToken);
            return next(withAuthHeader(req, newToken));
          }),
          catchError((refreshErr) => {
            isRefreshing = false;
            authService.logout();
            return throwError(() => refreshErr);
          })
        );
      }

      return refreshTokenSubject.pipe(
        filter((newToken) => newToken !== null),
        take(1),
        switchMap((newToken) => next(withAuthHeader(req, newToken as string)))
      );
    })
  );
};
