import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export type UserRole = 'estudiante' | 'profesor' | 'admin' | 'padre';

export interface ApiUser {
  id: string;
  username?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: { name: string; permissions?: { permission: { action: string } }[] };
  status: string;
  avatarUrl?: string | null;
}

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  photo?: string | null;
}

interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: ApiUser;
  };
}

interface MeResponse {
  success: boolean;
  data: ApiUser;
}

function mapRole(apiRole: string): UserRole {
  switch (apiRole.toUpperCase()) {
    case 'STUDENT': return 'estudiante';
    case 'TEACHER': return 'profesor';
    case 'ADMIN':   return 'admin';
    case 'PARENT':  return 'padre';
    default:        return 'estudiante';
  }
}

function mapApiUser(apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    username: apiUser.username ?? apiUser.email,
    email: apiUser.email,
    firstName: apiUser.firstName,
    lastName: apiUser.lastName,
    name: `${apiUser.firstName} ${apiUser.lastName}`,
    role: mapRole(apiUser.role.name),
    photo: apiUser.avatarUrl
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = environment.apiUrl;

  private currentUser = signal<User | null>(null);
  private isAuthenticated = signal(false);

  user = computed(() => this.currentUser());
  authenticated = computed(() => this.isAuthenticated());
  userRole = computed(() => this.currentUser()?.role ?? null);

  constructor(private http: HttpClient, private router: Router) {
    if (typeof window !== 'undefined') {
      this.restoreSession();
    }
  }

  login(identifier: string, password: string, rememberMe = false): Observable<LoginResponse> {
    // Contrato API (FRONTEND.md): { email, password } o usuario sin @ con { username, password }.
    // No mezclar ambos campos: algunos backends validan email XOR username y rechazan login.
    const id = identifier.trim();
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
    const body = looksLikeEmail
      ? ({ email: id, password } as Record<string, string>)
      : ({ username: id, password } as Record<string, string>);
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, body).pipe(
      tap(res => {
        const { accessToken, refreshToken, user } = res.data;
        this.saveTokens(accessToken, refreshToken, rememberMe);
        const mapped = mapApiUser(user);
        this.currentUser.set(mapped);
        this.isAuthenticated.set(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentUser', JSON.stringify(mapped));
        }
        this.redirectByRole(mapped.role);
      })
    );
  }

  logout(): void {
    const token = this.getAccessToken();
    if (token) {
      this.http.post(`${this.baseUrl}/auth/logout`, {}).subscribe({ error: () => {} });
    }
    this.clearSession();
    this.router.navigate(['/login']);
  }

  getMe(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.baseUrl}/auth/me`).pipe(
      tap(res => {
        const mapped = mapApiUser(res.data);
        this.currentUser.set(mapped);
        this.isAuthenticated.set(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentUser', JSON.stringify(mapped));
        }
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/auth/change-password`, { currentPassword, newPassword });
  }

  forgotPassword(identifier: string): Observable<unknown> {
    const id = identifier.trim();
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
    const body = looksLikeEmail
      ? { email: id }
      : ({ username: id } as Record<string, string>);
    return this.http.post(`${this.baseUrl}/auth/forgot-password`, body);
  }

  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  }

  hasRole(role: UserRole): boolean {
    return this.currentUser()?.role === role;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  private saveTokens(accessToken: string, refreshToken: string, rememberMe: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('rememberMe', String(rememberMe));
    if (rememberMe) {
      localStorage.setItem('accessToken', accessToken);
    } else {
      sessionStorage.setItem('accessToken', accessToken);
    }
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearSession(): void {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('accessToken');
  }

  private restoreSession(): void {
    const stored = localStorage.getItem('currentUser');
    const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
    if (stored && token) {
      try {
        const user: User = JSON.parse(stored);
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      } catch {
        this.clearSession();
      }
    }
  }

  private redirectByRole(role: UserRole): void {
    const map: Record<UserRole, string> = {
      estudiante: '/dashboard',
      profesor: '/profesor/dashboard',
      admin: '/admin/dashboard',
      padre: '/padre/dashboard'
    };
    this.router.navigate([map[role] ?? '/login']);
  }
}
