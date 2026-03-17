import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (typeof window === 'undefined') return next(req);

  const router = inject(Router);
  const http = inject(HttpClient);

  // No agregar token en rutas públicas de auth
  const isPublic = req.url.includes('/auth/login') ||
    req.url.includes('/auth/refresh-token') ||
    req.url.includes('/auth/forgot-password');

  const accessToken = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');

  const authReq = (!isPublic && accessToken) ? addToken(req, accessToken) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isPublic && !req.url.includes('/auth/refresh-token')) {
        return handle401Error(req, next, http, router);
      }
      return throwError(() => error);
    })
  );
};

function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  http: HttpClient,
  router: Router
) {
  if (isRefreshing) {
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => next(addToken(req, token!)))
    );
  }

  isRefreshing = true;
  refreshTokenSubject.next(null);

  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    isRefreshing = false;
    clearTokens();
    router.navigate(['/login']);
    return throwError(() => new Error('No refresh token'));
  }

  return http.post<{ success: boolean; data: { accessToken: string; refreshToken: string } }>(
    `${environment.apiUrl}/auth/refresh-token`,
    { refreshToken }
  ).pipe(
    switchMap(response => {
      isRefreshing = false;
      const { accessToken, refreshToken: newRefresh } = response.data;
      saveTokens(accessToken, newRefresh);
      refreshTokenSubject.next(accessToken);
      return next(addToken(req, accessToken));
    }),
    catchError(err => {
      isRefreshing = false;
      clearTokens();
      router.navigate(['/login']);
      return throwError(() => err);
    })
  );
}

function saveTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return;
  const rememberMe = localStorage.getItem('rememberMe') === 'true';
  if (rememberMe) {
    localStorage.setItem('accessToken', accessToken);
  } else {
    sessionStorage.setItem('accessToken', accessToken);
  }
  localStorage.setItem('refreshToken', refreshToken);
}

function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('rememberMe');
  sessionStorage.removeItem('accessToken');
}
