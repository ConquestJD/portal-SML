import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  studentName = signal('Juan Pérez');
  grade = signal('3ro');
  section = signal('A');
  
  averageGrade = signal(16.5);
  pendingTasks = signal(5);
  attendancePercentage = signal(95);
  upcomingEvaluations = signal(3);

  quickAccess = signal([
    { icon: 'fas fa-book', title: 'Mis Cursos', link: '/cursos', count: 8 },
    { icon: 'fas fa-tasks', title: 'Tareas', link: '/tareas', count: this.pendingTasks() },
    { icon: 'fas fa-chart-line', title: 'Notas', link: '/notas' },
    { icon: 'fas fa-calendar-alt', title: 'Asistencia', link: '/asistencia' },
    { icon: 'fas fa-bullhorn', title: 'Comunicados', link: '/comunicados', count: 2 },
    { icon: 'fas fa-user', title: 'Perfil', link: '/perfil' }
  ]);

  alerts = signal([
    { type: 'warning', message: 'Tienes 2 tareas vencidas', link: '/tareas' },
    { type: 'info', message: 'Nuevo comunicado del director', link: '/comunicados' }
  ]);

  recentActivity = signal([
    { type: 'task', message: 'Entregaste "Proyecto de Matemática"', time: 'Hace 2 horas' },
    { type: 'grade', message: 'Nueva calificación en Lengua: 18', time: 'Hace 1 día' },
    { type: 'announcement', message: 'Nuevo comunicado sobre actividades', time: 'Hace 2 días' }
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
