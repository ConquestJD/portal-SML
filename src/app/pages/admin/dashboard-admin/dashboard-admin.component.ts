import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService, AdminDashboard, AdminAnnouncement } from '../../../services/dashboard.service';
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
  firstName = computed(() => this.adminName().trim().split(/\s+/)[0] || 'Administrador');

  totalStudents = signal(0);
  totalTeachers = signal(0);
  totalParents = signal(0);
  activeEnrollments = signal(0);
  pendingJustifications = signal(0);
  pendingPayments = signal(0);
  recentAnnouncements = signal<AdminAnnouncement[]>([]);

  hasAttention = computed(() =>
    this.pendingJustifications() > 0 || this.pendingPayments() > 0
  );

  shortcuts = [
    { label: 'Estudiantes', link: '/admin/estudiantes' },
    { label: 'Profesores', link: '/admin/profesores' },
    { label: 'Cursos', link: '/admin/cursos' },
    { label: 'Comunicados', link: '/admin/comunicados' },
    { label: 'Reportes', link: '/admin/reportes' },
    { label: 'Configuración', link: '/admin/configuracion' },
  ];

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const user = this.authService.user();
    if (user) this.adminName.set(user.name);
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading.set(true);
    this.error.set('');

    this.dashboardService.getAdminDashboard().subscribe({
      next: (data: AdminDashboard) => {
        this.totalStudents.set(data.summary.totalStudents);
        this.totalTeachers.set(data.summary.totalTeachers);
        this.totalParents.set(data.summary.totalParents);
        this.activeEnrollments.set(data.summary.activeEnrollments);
        this.pendingJustifications.set(data.summary.pendingJustifications);
        this.pendingPayments.set(data.summary.pendingPayments);
        this.recentAnnouncements.set(data.recentAnnouncements ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el panel.');
        this.loading.set(false);
      }
    });
  }

  greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  formatAnnouncementDate(item: AdminAnnouncement): string {
    const raw = item.publishedAt ?? item.createdAt;
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  }
}
