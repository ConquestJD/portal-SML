import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { DashboardService, StudentDashboard } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatCardComponent, BadgeComponent, EmptyStateComponent, SkeletonComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  error = signal('');

  studentName = signal('');
  grade = signal('');
  section = signal('');
  studentCode = signal('');

  pendingTasks = signal(0);
  totalCourses = signal(0);
  presentCount = signal(0);
  absentCount = signal(0);
  lateCount = signal(0);
  recentGrades = signal<unknown[]>([]);
  recentAnnouncements = signal<unknown[]>([]);

  newCommunications = signal(0);
  heroBanner = signal<unknown>(null);
  alerts = signal<unknown[]>([]);
  upcomingEvaluationsList = signal<unknown[]>([]);
  recentActivity = signal<unknown[]>([]);

  quickAccess = signal([
    { icon: 'fas fa-book', title: 'Mis Cursos', link: '/cursos', count: 0 },
    { icon: 'fas fa-tasks', title: 'Tareas', link: '/tareas', count: 0 },
    { icon: 'fas fa-chart-line', title: 'Notas', link: '/notas' },
    { icon: 'fas fa-calendar-alt', title: 'Asistencia', link: '/asistencia' },
    { icon: 'fas fa-bullhorn', title: 'Comunicados', link: '/comunicados' },
    { icon: 'fas fa-user', title: 'Perfil', link: '/perfil' }
  ]);

  currentPeriod = signal('');

  constructor(private dashboardService: DashboardService, private authService: AuthService) {}

  ngOnInit() {
    const user = this.authService.user();
    if (user) this.studentName.set(user.name);

    this.dashboardService.getStudentDashboard().subscribe({
      next: (data: StudentDashboard) => {
        this.studentName.set(data.student.name);
        this.grade.set(data.student.grade);
        this.section.set(data.student.section);
        this.studentCode.set(data.student.studentCode);
        this.currentPeriod.set(data.student.academicYear);
        this.pendingTasks.set(data.summary.pendingTasks);
        this.totalCourses.set(data.summary.totalCourses);
        const att = data.summary.attendanceSummary;
        this.presentCount.set(att['PRESENT'] ?? 0);
        this.absentCount.set(att['ABSENT'] ?? 0);
        this.lateCount.set(att['LATE'] ?? 0);
        this.recentGrades.set(data.recentGrades);
        this.recentAnnouncements.set(data.recentAnnouncements);
        this.quickAccess.update(qa => qa.map(item => {
          if (item.title === 'Mis Cursos') return { ...item, count: data.summary.totalCourses };
          if (item.title === 'Tareas') return { ...item, count: data.summary.pendingTasks };
          return item;
        }));
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar dashboard'); this.loading.set(false); }
    });
  }

  get attendancePercentage(): number {
    const total = this.presentCount() + this.absentCount() + this.lateCount();
    if (!total) return 0;
    return Math.round((this.presentCount() / total) * 100);
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
}
