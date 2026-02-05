import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-admin.component.html',
  styleUrl: './dashboard-admin.component.css'
})
export class DashboardAdminComponent {
  adminName = signal('Administrador');
  
  totalStudents = signal(450);
  totalTeachers = signal(25);
  totalCourses = signal(120);
  pendingRequests = signal(8);

  quickAccess = signal([
    { icon: 'fas fa-users', title: 'Estudiantes', link: '/admin/estudiantes', count: this.totalStudents() },
    { icon: 'fas fa-chalkboard-teacher', title: 'Profesores', link: '/admin/profesores', count: this.totalTeachers() },
    { icon: 'fas fa-book', title: 'Cursos', link: '/admin/cursos', count: this.totalCourses() },
    { icon: 'fas fa-exclamation-circle', title: 'Solicitudes', link: '/admin/solicitudes', count: this.pendingRequests() },
    { icon: 'fas fa-cog', title: 'Configuración', link: '/admin/configuracion' },
    { icon: 'fas fa-chart-bar', title: 'Reportes', link: '/admin/reportes' }
  ]);

  alerts = signal([
    { type: 'warning', message: '8 solicitudes pendientes de revisión', link: '/admin/solicitudes' },
    { type: 'info', message: 'Nuevo estudiante registrado', link: '/admin/estudiantes' }
  ]);

  recentActivity = signal([
    { type: 'user', message: 'Nuevo estudiante registrado: María García', time: 'Hace 1 hora' },
    { type: 'course', message: 'Curso "Matemática Avanzada" creado', time: 'Hace 2 horas' },
    { type: 'request', message: 'Solicitud de cambio de horario aprobada', time: 'Hace 1 día' }
  ]);

  getCurrentDate() {
    return new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
