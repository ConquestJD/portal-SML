import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService, AdminDashboard, AdminAnnouncement } from '../../../services/dashboard.service';
import { AuthService } from '../../../services/auth.service';
import { AdminService, AcademicYearItem } from '../../../services/admin.service';

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
  years = signal<AcademicYearItem[]>([]);

  activeYear = computed(() => {
    const list = this.years();
    return list.find(y => this.isActiveYear(y.status)) ?? list[0] ?? null;
  });

  hasAttention = computed(() =>
    this.pendingJustifications() > 0 || this.pendingPayments() > 0
  );

  communitySize = computed(() =>
    this.totalStudents() + this.totalTeachers() + this.totalParents()
  );

  directory = [
    { label: 'Estudiantes', hint: 'Nómina y fichas', link: '/admin/estudiantes', photo: '/images/heroes/students.webp' },
    { label: 'Profesores', hint: 'Claustro docente', link: '/admin/profesores', photo: '/images/heroes/teachers.webp' },
    { label: 'Familias', hint: 'Padres de familia', link: '/admin/padres', photo: '/images/heroes/parents.webp' },
    { label: 'Plan de estudios', hint: 'Cursos y horarios', link: '/admin/cursos', photo: '/images/heroes/courses.webp' },
    { label: 'Matrícula', hint: 'Inscripciones', link: '/admin/matricula', photo: '/images/heroes/classrooms.webp' },
    { label: 'Comunicados', hint: 'Mural institucional', link: '/admin/comunicados', photo: '/images/heroes/announcements.webp' },
    { label: 'Reportes', hint: 'Indicadores', link: '/admin/reportes', photo: '/images/heroes/reports.webp' },
    { label: 'Identidad', hint: 'Sede y año lectivo', link: '/admin/configuracion', photo: '/images/heroes/settings.webp' },
  ];

  actions = [
    { label: 'Nueva matrícula', hint: 'Inscribir a un estudiante', link: '/admin/matricula' },
    { label: 'Registrar estudiante', hint: 'Alta en la nómina', link: '/admin/estudiantes/nuevo' },
    { label: 'Abrir un curso', hint: 'Plan de estudios', link: '/admin/cursos/crear' },
    { label: 'Publicar comunicado', hint: 'Mural del colegio', link: '/admin/comunicados' },
  ];

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private adminService: AdminService
  ) {}

  ngOnInit() {
    const user = this.authService.user();
    if (user) this.adminName.set(user.name);
    this.loadDashboard();
    this.adminService.getAcademicYears().subscribe({
      next: (years) => this.years.set(years),
      error: () => this.years.set([]),
    });
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

  weekdayLabel(): string {
    return this.capitalize(new Date().toLocaleDateString('es-PE', { weekday: 'long' }));
  }

  dayNumber(): string {
    return String(new Date().getDate());
  }

  monthYearLabel(): string {
    return this.capitalize(new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }));
  }

  formatAnnouncementDate(item: AdminAnnouncement): string {
    const raw = item.publishedAt ?? item.createdAt;
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  }

  announcementKicker(item: AdminAnnouncement): string {
    const p = (item.priority || '').toUpperCase();
    if (p === 'HIGH' || p === 'URGENT') return 'Urgente';
    const t = (item.type || '').toUpperCase();
    if (t === 'ACADEMIC') return 'Académico';
    if (t === 'EVENT') return 'Actividad';
    if (t === 'URGENT') return 'Urgente';
    return 'Comunicado';
  }

  announcementExcerpt(item: AdminAnnouncement): string {
    const raw = (item.content ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!raw) return '';
    return raw.length > 120 ? `${raw.slice(0, 117)}…` : raw;
  }

  private isActiveYear(status: string): boolean {
    const s = (status || '').toUpperCase();
    return s === 'ACTIVE' || s === 'ACTIVO';
  }

  private capitalize(value: string): string {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
