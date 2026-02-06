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
  
  // KPIs principales
  totalStudents = signal(450);
  totalTeachers = signal(25);
  totalCourses = signal(120);
  pendingRequests = signal(8);
  
  // KPIs adicionales
  attendanceToday = signal(425);
  activeTasks = signal(156);
  recentAnnouncements = signal(12);
  incidents = signal(3);
  usersCreated = signal(5);
  activeCourses = signal(98);

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
    { type: 'info', message: 'Nuevo estudiante registrado', link: '/admin/estudiantes' },
    { type: 'error', message: '3 incidencias reportadas hoy', link: '/admin/incidencias' }
  ]);

  recentActivity = signal([
    { type: 'user', message: 'Nuevo estudiante registrado: María García', time: 'Hace 1 hora' },
    { type: 'course', message: 'Curso "Matemática Avanzada" creado', time: 'Hace 2 horas' },
    { type: 'request', message: 'Solicitud de cambio de horario aprobada', time: 'Hace 1 día' },
    { type: 'attendance', message: 'Asistencia del día registrada: 425/450 estudiantes', time: 'Hace 2 horas' }
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
