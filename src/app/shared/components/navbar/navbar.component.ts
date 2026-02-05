import { Component, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  isMenuOpen = signal(false);
  notificationsCount = signal(3);

  constructor(public authService: AuthService) {}

  // Computed signals basados en el servicio de autenticación
  user = computed(() => this.authService.user());
  userName = computed(() => this.user()?.name || 'Usuario');
  userPhoto = computed(() => this.user()?.photo || 'https://via.placeholder.com/40');
  userRole = computed(() => this.user()?.role || 'estudiante');

  // Navegación según el rol
  navigationItems = computed(() => {
    const role = this.userRole();
    
    if (role === 'profesor') {
      return [
        { path: '/profesor/dashboard', label: 'Inicio', icon: 'fas fa-home' },
        { path: '/profesor/cursos', label: 'Mis Cursos', icon: 'fas fa-book' },
        { path: '/profesor/tareas', label: 'Tareas', icon: 'fas fa-tasks' },
        { path: '/profesor/notas', label: 'Calificaciones', icon: 'fas fa-chart-line' },
        { path: '/profesor/asistencia', label: 'Asistencia', icon: 'fas fa-calendar-alt' },
        { path: '/profesor/comunicados', label: 'Comunicados', icon: 'fas fa-bullhorn' }
      ];
    } else if (role === 'admin') {
      return [
        { path: '/admin/dashboard', label: 'Inicio', icon: 'fas fa-home' },
        { path: '/admin/estudiantes', label: 'Estudiantes', icon: 'fas fa-users' },
        { path: '/admin/profesores', label: 'Profesores', icon: 'fas fa-chalkboard-teacher' },
        { path: '/admin/cursos', label: 'Cursos', icon: 'fas fa-book' },
        { path: '/admin/solicitudes', label: 'Solicitudes', icon: 'fas fa-exclamation-circle' },
        { path: '/admin/reportes', label: 'Reportes', icon: 'fas fa-chart-bar' }
      ];
    } else {
      // Estudiante (por defecto)
      return [
        { path: '/dashboard', label: 'Inicio', icon: 'fas fa-home' },
        { path: '/cursos', label: 'Mis Cursos', icon: 'fas fa-book' },
        { path: '/tareas', label: 'Tareas', icon: 'fas fa-tasks' },
        { path: '/notas', label: 'Notas', icon: 'fas fa-chart-line' },
        { path: '/asistencia', label: 'Asistencia', icon: 'fas fa-calendar-alt' },
        { path: '/comunicados', label: 'Comunicados', icon: 'fas fa-bullhorn' }
      ];
    }
  });

  toggleMenu() {
    this.isMenuOpen.update(value => !value);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
  }

  logout() {
    this.authService.logout();
  }
}
