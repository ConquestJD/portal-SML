import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

export interface Alert {
  type: 'warning' | 'info' | 'danger';
  message: string;
  link: string;
}

export interface QuickAccess {
  icon: string;
  title: string;
  link: string;
  count?: number;
}

export interface RecentActivity {
  type: 'task' | 'grade' | 'announcement';
  message: string;
  time: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    StatCardComponent,
    BadgeComponent,
    EmptyStateComponent,
    SkeletonComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  // Estado de carga
  loading = signal(false);

  // Datos del estudiante
  studentName = signal('Juan Pérez');
  grade = signal('3ro');
  section = signal('A');

  // KPIs
  averageGrade = signal(16.5);
  pendingTasks = signal(5);
  attendancePercentage = signal(95);
  upcomingEvaluations = signal(3);
  newCommunications = signal(2);

  // Hero Banner (comunicado importante)
  heroBanner = signal<{
    type: 'urgent' | 'info' | 'warning';
    title: string;
    description?: string;
    link: string;
    badge?: string;
  } | null>({
    type: 'info',
    title: 'Nuevo comunicado del director',
    description: 'Información importante sobre actividades del período',
    link: '/comunicados',
    badge: 'Nuevo'
  });

  // Alertas (solo para tareas vencidas críticas)
  alerts = signal<Alert[]>([
    { type: 'warning', message: 'Tienes 2 tareas vencidas que requieren atención', link: '/tareas' }
  ]);

  // Próximas evaluaciones
  upcomingEvaluationsList = signal([
    { title: 'Examen de Matemática', date: '15 Feb', time: '10:00 AM', course: 'Matemática' },
    { title: 'Proyecto de Lengua', date: '18 Feb', time: '11:30 AM', course: 'Lengua' },
    { title: 'Evaluación de Ciencias', date: '20 Feb', time: '09:00 AM', course: 'Ciencias' }
  ]);

  // Período actual
  currentPeriod = signal('2024-I');

  // Accesos rápidos
  quickAccess = signal<QuickAccess[]>([
    { icon: 'fas fa-book', title: 'Mis Cursos', link: '/cursos', count: 8 },
    { icon: 'fas fa-tasks', title: 'Tareas', link: '/tareas', count: this.pendingTasks() },
    { icon: 'fas fa-chart-line', title: 'Notas', link: '/notas' },
    { icon: 'fas fa-calendar-alt', title: 'Asistencia', link: '/asistencia' },
    { icon: 'fas fa-bullhorn', title: 'Comunicados', link: '/comunicados', count: this.newCommunications() },
    { icon: 'fas fa-user', title: 'Perfil', link: '/perfil' }
  ]);

  // Actividad reciente
  recentActivity = signal<RecentActivity[]>([
    { type: 'task', message: 'Entregaste "Proyecto de Matemática"', time: 'Hace 2 horas' },
    { type: 'grade', message: 'Nueva calificación en Lengua: 18', time: 'Hace 1 día' },
    { type: 'announcement', message: 'Nuevo comunicado sobre actividades extracurriculares', time: 'Hace 2 días' }
  ]);


  getCurrentDate(): string {
    return new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
