import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';

export type UserRole = 'estudiante' | 'profesor' | 'admin' | 'padre';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  email: string;
  role: UserRole;
  photo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Usuarios de ejemplo
  private users: User[] = [
    {
      id: '1',
      username: 'alumno',
      password: 'alumno123',
      name: 'Juan Pérez',
      email: 'alumno@colegio.edu',
      role: 'estudiante',
    },
    {
      id: '2',
      username: 'profesor',
      password: 'profesor123',
      name: 'Prof. María González',
      email: 'profesor@colegio.edu',
      role: 'profesor',
    },
    {
      id: '3',
      username: 'admin',
      password: 'admin123',
      name: 'Administrador',
      email: 'admin@colegio.edu',
      role: 'admin',
    },
    {
      id: '4',
      username: 'padre',
      password: 'padre123',
      name: 'Carlos Rodríguez',
      email: 'padre@colegio.edu',
      role: 'padre',
    }
  ];

  private currentUser = signal<User | null>(null);
  private isAuthenticated = signal(false);

  // Computed signals
  user = computed(() => this.currentUser());
  authenticated = computed(() => this.isAuthenticated());
  userRole = computed(() => this.currentUser()?.role || null);

  constructor(private router: Router) {
    // Verificar si hay sesión guardada solo en el cliente
    if (typeof window !== 'undefined') {
      this.checkStoredSession();
    }
  }

  login(username: string, password: string, rememberMe: boolean = false): { success: boolean; message?: string } {
    const user = this.users.find(
      u => u.username === username && u.password === password
    );

    if (!user) {
      return {
        success: false,
        message: 'Usuario o contraseña incorrectos'
      };
    }

    // Establecer usuario actual
    this.currentUser.set(user);
    this.isAuthenticated.set(true);

    // Guardar sesión si se seleccionó "Recordarme" (solo en el cliente)
    if (typeof window !== 'undefined') {
      if (rememberMe) {
        localStorage.setItem('currentUser', JSON.stringify(user));
      } else {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
      }
    }

    // Redirigir según el rol
    this.redirectByRole(user.role);

    return { success: true };
  }

  logout(): void {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUser');
      sessionStorage.removeItem('currentUser');
    }
    this.router.navigate(['/login']);
  }

  private redirectByRole(role: UserRole): void {
    switch (role) {
      case 'estudiante':
        this.router.navigate(['/dashboard']);
        break;
      case 'profesor':
        this.router.navigate(['/profesor/dashboard']);
        break;
      case 'admin':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'padre':
        this.router.navigate(['/padre/dashboard']);
        break;
      default:
        this.router.navigate(['/login']);
    }
  }

  private checkStoredSession(): void {
    // Solo verificar en el cliente (no en SSR)
    if (typeof window === 'undefined') {
      return;
    }

    // Verificar localStorage primero (recordarme)
    let storedUser = localStorage.getItem('currentUser');
    
    // Si no hay en localStorage, verificar sessionStorage
    if (!storedUser) {
      storedUser = sessionStorage.getItem('currentUser');
    }

    if (storedUser) {
      try {
        const user: User = JSON.parse(storedUser);
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      } catch (error) {
        console.error('Error al cargar sesión:', error);
        this.clearStoredSession();
      }
    }
  }

  private clearStoredSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUser');
      sessionStorage.removeItem('currentUser');
    }
  }

  hasRole(role: UserRole): boolean {
    return this.currentUser()?.role === role;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }
}
