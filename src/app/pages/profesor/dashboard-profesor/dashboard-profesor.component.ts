import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard-profesor',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-profesor.component.html',
  styleUrl: './dashboard-profesor.component.css'
})
export class DashboardProfesorComponent {
  teacherName = signal('Prof. María González');
  department = signal('Matemática');
  
  totalCourses = signal(6);
  totalStudents = signal(180);
  pendingGrading = signal(24);
  attendancePending = signal(8);

  quickAccess = signal([
    { icon: 'fas fa-book', title: 'Mis Cursos', link: '/profesor/cursos', count: this.totalCourses() },
    { icon: 'fas fa-tasks', title: 'Tareas', link: '/profesor/tareas', count: this.pendingGrading() },
    { icon: 'fas fa-chart-line', title: 'Calificaciones', link: '/profesor/notas' },
    { icon: 'fas fa-calendar-alt', title: 'Asistencia', link: '/profesor/asistencia', count: this.attendancePending() },
    { icon: 'fas fa-users', title: 'Estudiantes', link: '/profesor/cursos' },
    { icon: 'fas fa-bullhorn', title: 'Comunicados', link: '/profesor/comunicados', count: 2 }
  ]);

  alerts = signal([
    { type: 'warning', message: 'Tienes 8 asistencias pendientes de marcar', link: '/profesor/asistencia' },
    { type: 'info', message: '24 tareas esperan calificación', link: '/profesor/tareas' }
  ]);

  recentActivity = signal([
    { type: 'grade', message: 'Calificaste 15 tareas de Matemática', time: 'Hace 1 hora' },
    { type: 'attendance', message: 'Marcaste asistencia para 3ro A', time: 'Hace 2 horas' },
    { type: 'task', message: 'Creaste nueva tarea "Álgebra Lineal"', time: 'Hace 1 día' }
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
