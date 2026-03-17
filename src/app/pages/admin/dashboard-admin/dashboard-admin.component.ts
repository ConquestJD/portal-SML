import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService, AdminDashboard } from '../../../services/dashboard.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-admin.component.html',
  styleUrl: './dashboard-admin.component.css'
})
export class DashboardAdminComponent implements OnInit {
  loading = signal(true);
  error = signal('');

  adminName = signal('Administrador');

  totalStudents = signal(0);
  totalTeachers = signal(0);
  totalParents = signal(0);
  activeEnrollments = signal(0);
  pendingJustifications = signal(0);
  pendingPayments = signal(0);

  recentAnnouncements = signal<unknown[]>([]);
  totalCourses = signal(0);
  attendanceToday = signal(0);
  activeTasks = signal(0);
  incidents = signal(0);
  usersCreated = signal(0);
  activeCourses = signal(0);
  alerts = signal<{ type: string; message: string; link: string }[]>([]);
  recentActivity = signal<{ type: string; message: string; time: string }[]>([]);

  quickAccess = signal([
    { icon: 'fas fa-users', title: 'Estudiantes', link: '/admin/estudiantes', count: 0 },
    { icon: 'fas fa-chalkboard-teacher', title: 'Profesores', link: '/admin/profesores', count: 0 },
    { icon: 'fas fa-book', title: 'Cursos', link: '/admin/cursos', count: 0 },
    { icon: 'fas fa-cog', title: 'Configuración', link: '/admin/configuracion' },
    { icon: 'fas fa-chart-bar', title: 'Reportes', link: '/admin/reportes' }
  ]);

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const user = this.authService.user();
    if (user) this.adminName.set(user.name);

    this.dashboardService.getAdminDashboard().subscribe({
      next: (data: AdminDashboard) => {
        this.totalStudents.set(data.summary.totalStudents);
        this.totalTeachers.set(data.summary.totalTeachers);
        this.totalParents.set(data.summary.totalParents);
        this.activeEnrollments.set(data.summary.activeEnrollments);
        this.pendingJustifications.set(data.summary.pendingJustifications);
        this.pendingPayments.set(data.summary.pendingPayments);
        if (data.recentAnnouncements) this.recentAnnouncements.set(data.recentAnnouncements);
        this.quickAccess.update(qa => qa.map(item => {
          if (item.title === 'Estudiantes') return { ...item, count: data.summary.totalStudents };
          if (item.title === 'Profesores') return { ...item, count: data.summary.totalTeachers };
          return item;
        }));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el dashboard');
        this.loading.set(false);
      }
    });
  }

  getCurrentDate() {
    return new Date().toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }
}
