import { Injectable, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, forkJoin } from 'rxjs';
import { AuthService, UserRole } from './auth.service';
import { DashboardService } from './dashboard.service';
import { AnnouncementService } from './announcement.service';
import { StudentService } from './student.service';

/** Última visita a Actividad (alumno); novedades posteriores alimentan el badge. */
const LS_ACTIVIDAD_SEEN = 'sml_nav_estudiante_actividad_seen';

@Injectable({ providedIn: 'root' })
export class NavBadgesService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dashboard = inject(DashboardService);
  private readonly announcements = inject(AnnouncementService);
  private readonly student = inject(StudentService);

  /** Entregas de alumnos pendientes de calificar (SUBMITTED / LATE). */
  readonly teacherTareas = signal(0);
  /** Comunicados globales no leídos (docente). */
  readonly teacherComunicados = signal(0);

  /** Tareas publicadas pendientes de entregar (según dashboard alumno). */
  readonly studentTareas = signal(0);
  /** Novedades en la línea de tiempo posteriores a la última visita a Actividad. */
  readonly studentActividad = signal(0);
  readonly studentComunicados = signal(0);

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      this.onNavigation((e as NavigationEnd).urlAfterRedirects ?? '');
    });
  }

  /** Ajusta "visto" según ruta y recalcula contadores. */
  private onNavigation(fullUrl: string) {
    const path = fullUrl.split('#')[0].split('?')[0];
    if (this.auth.userRole() === 'estudiante' && (path === '/actividad' || path.startsWith('/actividad/'))) {
      try {
        localStorage.setItem(LS_ACTIVIDAD_SEEN, new Date().toISOString());
      } catch {
        /* ignore */
      }
    }
    this.refresh();
  }

  clear() {
    this.teacherTareas.set(0);
    this.teacherComunicados.set(0);
    this.studentTareas.set(0);
    this.studentActividad.set(0);
    this.studentComunicados.set(0);
  }

  refresh() {
    if (!this.auth.authenticated()) {
      this.clear();
      return;
    }
    const role = this.auth.userRole() as UserRole | null;
    if (role === 'profesor') this.loadTeacher();
    else if (role === 'estudiante') this.loadStudent();
    else this.clear();
  }

  private loadTeacher() {
    forkJoin({
      dash: this.dashboard.getTeacherDashboard(),
      ann: this.announcements.getAnnouncements({ read: false, page: 1, pageSize: 1 }),
    }).subscribe({
      next: ({ dash, ann }) => {
        this.teacherTareas.set(Math.max(0, Number(dash.summary?.pendingGrading ?? 0)));
        this.teacherComunicados.set(Math.max(0, Number(ann.meta?.total ?? 0)));
      },
      error: () => {
        this.teacherTareas.set(0);
        this.teacherComunicados.set(0);
      },
    });
  }

  private loadStudent() {
    let sinceTs = 0;
    try {
      const raw = localStorage.getItem(LS_ACTIVIDAD_SEEN);
      if (raw) {
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) sinceTs = d.getTime();
      } else {
        sinceTs = Date.now();
      }
    } catch {
      sinceTs = Date.now();
    }

    forkJoin({
      dash: this.dashboard.getStudentDashboard(),
      ann: this.announcements.getAnnouncements({ read: false, page: 1, pageSize: 1 }),
      activity: this.student.getActivity(),
    }).subscribe({
      next: ({ dash, ann, activity }) => {
        this.studentTareas.set(Math.max(0, Number(dash.summary?.pendingTasks ?? 0)));
        this.studentComunicados.set(Math.max(0, Number(ann.meta?.total ?? 0)));
        let n = 0;
        for (const item of activity) {
          const t = item.at ? new Date(item.at).getTime() : 0;
          if (t > sinceTs) n++;
        }
        this.studentActividad.set(n);
      },
      error: () => {
        this.studentTareas.set(0);
        this.studentActividad.set(0);
        this.studentComunicados.set(0);
      },
    });
  }

  /** Texto compacto para el chip (cap 99+). */
  formatCount(n: number): string {
    if (n <= 0) return '';
    return n > 99 ? '99+' : String(n);
  }

  badgeForPath(path: string): number {
    const role = this.auth.userRole();
    if (role === 'profesor') {
      if (path === '/profesor/actividad') return this.teacherTareas();
      if (path === '/profesor/comunicados') return this.teacherComunicados();
    }
    if (role === 'estudiante') {
      if (path === '/actividad') return this.studentActividad();
      if (path === '/cursos') return this.studentTareas();
      if (path === '/comunicados') return this.studentComunicados();
    }
    return 0;
  }
}
