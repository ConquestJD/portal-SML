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

  hasAttention = computed(() => this.deskItems().length > 0);

  notEnrolled = computed(() => Math.max(0, this.totalStudents() - this.activeEnrollments()));

  deskItems = computed(() => {
    const items: { n: string; label: string; hint: string; link: string }[] = [];
    if (this.pendingPayments() > 0) {
      items.push({
        n: String(this.pendingPayments()),
        label: this.pendingPayments() === 1 ? 'Pago por regularizar' : 'Pagos por regularizar',
        hint: 'Tesorería familiar',
        link: '/admin/reportes',
      });
    }
    if (this.pendingJustifications() > 0) {
      items.push({
        n: String(this.pendingJustifications()),
        label: this.pendingJustifications() === 1 ? 'Justificación por revisar' : 'Justificaciones por revisar',
        hint: 'Asistencia de estudiantes',
        link: '/admin/estudiantes',
      });
    }
    if (this.notEnrolled() > 0) {
      items.push({
        n: String(this.notEnrolled()),
        label: this.notEnrolled() === 1 ? 'Estudiante sin matrícula este año' : 'Estudiantes sin matrícula este año',
        hint: 'Inscripciones',
        link: '/admin/matricula',
      });
    }
    if (this.totalTeachers() === 0) {
      items.push({
        n: '',
        label: 'Sin docentes en el claustro',
        hint: 'Hay que registrar al menos un profesor',
        link: '/admin/profesores',
      });
    }
    if (this.totalStudents() === 0) {
      items.push({
        n: '',
        label: 'La nómina está vacía',
        hint: 'Registrar al primer estudiante',
        link: '/admin/estudiantes/nuevo',
      });
    }
    if (this.totalParents() === 0 && this.totalStudents() > 0) {
      items.push({
        n: '',
        label: 'Ningún hogar vinculado',
        hint: 'Registrar padres de familia',
        link: '/admin/padres',
      });
    }
    return items;
  });

  enrollmentNote = computed(() => {
    const year = this.activeYear()?.name;
    const students = this.totalStudents();
    const missing = this.notEnrolled();
    if (students === 0) return 'Todavía no hay estudiantes en la nómina.';
    if (missing === 0) {
      if (students === 1) {
        return year ? `El estudiante está matriculado en ${year}.` : 'El estudiante está matriculado.';
      }
      return year
        ? `Los ${students} estudiantes están matriculados en ${year}.`
        : `Los ${students} estudiantes están matriculados.`;
    }
    return year
      ? `${missing} de ${students} aún no ${missing === 1 ? 'está matriculado' : 'están matriculados'} en ${year}.`
      : `${missing} de ${students} aún no ${missing === 1 ? 'tiene' : 'tienen'} matrícula vigente.`;
  });

  statusLine = computed(() => {
    const year = this.activeYear()?.name;
    if (this.pendingPayments() > 0) {
      const n = this.pendingPayments();
      return `${n} ${n === 1 ? 'pago' : 'pagos'} por regularizar`;
    }
    if (this.pendingJustifications() > 0) {
      const n = this.pendingJustifications();
      return `${n} ${n === 1 ? 'justificación' : 'justificaciones'} por revisar`;
    }
    if (this.notEnrolled() > 0) {
      const n = this.notEnrolled();
      return `${n} ${n === 1 ? 'estudiante' : 'estudiantes'} sin matrícula`;
    }
    if (this.totalTeachers() === 0) return 'Falta registrar el claustro';
    if (this.totalStudents() === 0) return 'Nómina vacía';
    return year ? `Año lectivo ${year} · al día` : 'Colegio de alto rendimiento · Abancay';
  });

  actions = [
    { label: 'Nueva matrícula', hint: 'Inscribir a un estudiante', link: '/admin/matricula' },
    { label: 'Registrar estudiante', hint: 'Alta en la nómina', link: '/admin/estudiantes/nuevo' },
    { label: 'Abrir un curso', hint: 'Plan de estudios', link: '/admin/cursos/crear' },
    { label: 'Publicar comunicado', hint: 'Mural del colegio', link: '/admin/comunicados' },
    { label: 'Ingreso diario', hint: 'Nómina del día o abrir el lector', link: '/admin/asistencia-ingreso' },
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
