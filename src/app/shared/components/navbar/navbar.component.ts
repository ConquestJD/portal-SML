import { Component, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

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
  userPhoto = computed(() => this.user()?.photo);
  userRole = computed(() => this.user()?.role || 'estudiante');

  // Navegación según el rol
  navigationItems = computed(() => {
    const role = this.userRole();
    
    if (role === 'profesor') {
      return [
        { path: '/profesor/dashboard', label: 'Inicio', icon: 'fas fa-home', exact: true },
        { path: '/profesor/cursos', label: 'Mis Cursos', icon: 'fas fa-book', exact: false },
        { path: '/profesor/tareas', label: 'Tareas', icon: 'fas fa-tasks', exact: false },
        { path: '/profesor/notas', label: 'Calificaciones', icon: 'fas fa-chart-line', exact: false },
        { path: '/profesor/asistencia', label: 'Asistencia', icon: 'fas fa-calendar-alt', exact: false },
        { path: '/profesor/comunicados', label: 'Comunicados', icon: 'fas fa-bullhorn', exact: false }
      ];
    } else if (role === 'admin') {
      return [
        { path: '/admin/dashboard', label: 'Inicio', icon: 'fas fa-home', exact: true },
        { path: '/admin/estudiantes', label: 'Estudiantes', icon: 'fas fa-users', exact: false },
        { path: '/admin/profesores', label: 'Profesores', icon: 'fas fa-chalkboard-teacher', exact: false },
        { path: '/admin/cursos', label: 'Cursos', icon: 'fas fa-book', exact: false },
        { path: '/admin/solicitudes', label: 'Solicitudes', icon: 'fas fa-exclamation-circle', exact: false },
        { path: '/admin/reportes', label: 'Reportes', icon: 'fas fa-chart-bar', exact: false }
      ];
    } else if (role === 'padre') {
      return [
        { path: '/padre/dashboard', label: 'Inicio', icon: 'fas fa-home', exact: true },
        { path: '/padre/perfil-hijo', label: 'Perfil del Hijo', icon: 'fas fa-user', exact: false },
        { path: '/padre/cursos', label: 'Cursos', icon: 'fas fa-book', exact: false },
        { path: '/padre/tareas', label: 'Tareas', icon: 'fas fa-tasks', exact: false },
        { path: '/padre/notas', label: 'Notas', icon: 'fas fa-chart-line', exact: false },
        { path: '/padre/asistencia', label: 'Asistencia', icon: 'fas fa-calendar-alt', exact: false },
        { path: '/padre/comunicados', label: 'Comunicados', icon: 'fas fa-bullhorn', exact: false },
        { path: '/padre/mensajeria', label: 'Mensajería', icon: 'fas fa-envelope', exact: false }
      ];
    } else {
      // Estudiante (por defecto)
      return [
        { path: '/dashboard', label: 'Inicio', icon: 'fas fa-home', exact: true },
        { path: '/cursos', label: 'Mis Cursos', icon: 'fas fa-book', exact: false },
        { path: '/tareas', label: 'Tareas', icon: 'fas fa-tasks', exact: false },
        { path: '/notas', label: 'Notas', icon: 'fas fa-chart-line', exact: false },
        { path: '/asistencia', label: 'Asistencia', icon: 'fas fa-calendar-alt', exact: false },
        { path: '/comunicados', label: 'Comunicados', icon: 'fas fa-bullhorn', exact: false }
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
