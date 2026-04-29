import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { DashboardService, StudentDashboard } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { StudentService, StudentCourse, StudentTask, StudentGrade } from '../../services/student.service';
import { AnnouncementService, Announcement } from '../../services/announcement.service';

export interface DashboardHeroBanner {
  type: 'urgent' | 'warning' | 'info';
  title: string;
  description?: string;
  link: string;
  badge?: string;
}

export interface UpcomingEvalItem {
  title: string;
  course: string;
  date: string;
  time: string;
}

export interface ActivityItem {
  message: string;
  time: string;
  type: string;
}

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

  /** Promedio mostrado en KPI (número o "—"). */
  averageGrade = signal<string | number>('—');
  /** Cantidad de entregas / evaluaciones próximas (tareas con fecha límite). */
  upcomingEvaluationsCount = signal(0);

  newCommunications = signal(0);
  heroBanner = signal<DashboardHeroBanner | null>(null);
  alerts = signal<{ type: string; message: string; link: string }[]>([]);
  upcomingEvaluationsList = signal<UpcomingEvalItem[]>([]);
  recentActivity = signal<ActivityItem[]>([]);

  /** Cursos matriculados (vista resumen). */
  enrolledCourses = signal<StudentCourse[]>([]);
  /** Primer curso para enlace a mensajería. */
  firstCourseId = signal('');

  quickAccess = signal([
    { icon: 'fas fa-book', title: 'Mis Cursos', link: '/cursos', count: 0 },
    { icon: 'fas fa-tasks', title: 'Tareas', link: '/tareas', count: 0 },
    { icon: 'fas fa-chart-line', title: 'Notas', link: '/notas' },
    { icon: 'fas fa-calendar-alt', title: 'Asistencia', link: '/asistencia' },
    { icon: 'fas fa-bullhorn', title: 'Comunicados', link: '/comunicados' },
    { icon: 'fas fa-user', title: 'Perfil', link: '/perfil' }
  ]);

  currentPeriod = signal('');

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private studentService: StudentService,
    private announcementService: AnnouncementService,
  ) {}

  ngOnInit() {
    const user = this.authService.user();
    if (user) this.studentName.set(user.name);

    const emptyAnn = {
      data: [] as Announcement[],
      meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    };

    forkJoin({
      dashboard: this.dashboardService.getStudentDashboard().pipe(
        catchError(() => of(null as StudentDashboard | null)),
      ),
      courses: this.studentService.getCourses().pipe(catchError(() => of([] as StudentCourse[]))),
      tasks: this.studentService.getTasks({}).pipe(catchError(() => of([] as StudentTask[]))),
      grades: this.studentService.getGrades({}).pipe(catchError(() => of([] as StudentGrade[]))),
      announcements: this.announcementService.getAnnouncements({ pageSize: 12 }).pipe(
        catchError(() => of(emptyAnn)),
      ),
    }).subscribe(({ dashboard, courses, tasks, grades, announcements }) => {
      if (!dashboard) {
        this.error.set('Error al cargar dashboard');
        this.loading.set(false);
        return;
      }

      this.studentName.set(dashboard.student.name);
      this.grade.set(dashboard.student.grade);
      this.section.set(dashboard.student.section);
      this.studentCode.set(dashboard.student.studentCode);
      this.currentPeriod.set(dashboard.student.academicYear);
      this.pendingTasks.set(dashboard.summary.pendingTasks);
      this.totalCourses.set(dashboard.summary.totalCourses);
      const att = dashboard.summary.attendanceSummary;
      this.presentCount.set(att['PRESENT'] ?? 0);
      this.absentCount.set(att['ABSENT'] ?? 0);
      this.lateCount.set(att['LATE'] ?? 0);
      this.recentGrades.set(dashboard.recentGrades);
      this.recentAnnouncements.set(dashboard.recentAnnouncements);

      this.enrolledCourses.set(courses);
      this.firstCourseId.set(courses[0]?.id ?? '');

      this.averageGrade.set(this.computeAverageGrade(dashboard.recentGrades, grades));

      const upcoming = this.buildUpcomingFromTasks(tasks);
      this.upcomingEvaluationsList.set(upcoming);
      this.upcomingEvaluationsCount.set(upcoming.length);

      const ann = announcements.data ?? [];
      const unread = ann.filter(a => !a.isRead).length;
      this.newCommunications.set(unread);

      const urgent = ann.find(a => !a.isRead && (a.priority === 'HIGH' || (a.priority as string) === 'URGENT'));
      if (urgent) {
        const plain = (urgent.content ?? '').replace(/<[^>]*>/g, '').trim();
        this.heroBanner.set({
          type: 'urgent',
          title: urgent.title,
          description: plain.length > 160 ? `${plain.slice(0, 160)}…` : plain,
          link: `/comunicados/${urgent.id}`,
          badge: 'Importante',
        });
      }

      this.recentActivity.set(this.buildRecentActivity(dashboard, tasks, ann));

      this.quickAccess.update(qa =>
        qa.map(item => {
          if (item.title === 'Mis Cursos') return { ...item, count: courses.length || dashboard.summary.totalCourses };
          if (item.title === 'Tareas') return { ...item, count: dashboard.summary.pendingTasks };
          return item;
        }),
      );

      this.loading.set(false);
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

  private computeAverageGrade(recent: unknown[], allGrades: StudentGrade[]): string | number {
    const scores: number[] = [];
    const push = (v: unknown) => {
      if (typeof v === 'number' && !Number.isNaN(v)) scores.push(v);
      else if (v != null && v !== '') {
        const n = Number(v);
        if (!Number.isNaN(n)) scores.push(n);
      }
    };
    for (const g of recent ?? []) {
      const o = g as Record<string, unknown>;
      push(o?.['score']);
    }
    for (const g of allGrades) push(g.score);
    if (!scores.length) return '—';
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(avg * 20) / 20;
  }

  private buildUpcomingFromTasks(tasks: StudentTask[]): UpcomingEvalItem[] {
    const now = Date.now();
    return [...tasks]
      .filter(t => {
        if (!t.dueDate) return false;
        const st = (t.submission?.status ?? '').toUpperCase();
        if (st === 'GRADED' || st === 'SUBMITTED' || st === 'APPROVED') return false;
        const d = new Date(t.dueDate).getTime();
        return !Number.isNaN(d) && d >= now - 86_400_000;
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 8)
      .map(t => {
        const dt = new Date(t.dueDate!);
        return {
          title: t.title,
          course: t.course?.name ?? 'Curso',
          date: dt.toLocaleDateString('es-PE', { dateStyle: 'medium' }),
          time: dt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        };
      });
  }

  private fmtRelativeTime(iso: string | undefined | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
  }

  private buildRecentActivity(
    dashboard: StudentDashboard,
    tasks: StudentTask[],
    announcements: Announcement[],
  ): ActivityItem[] {
    type T = ActivityItem & { ts: number };
    const items: T[] = [];

    for (const g of dashboard.recentGrades ?? []) {
      const o = g as Record<string, unknown>;
      const score = o['score'];
      const course = (o['course'] as Record<string, string> | undefined)?.['name'] ?? (o['courseName'] as string) ?? 'Curso';
      const at = (o['createdAt'] ?? o['date']) as string | undefined;
      const ts = at ? new Date(at).getTime() : 0;
      if (score != null && score !== '') {
        items.push({
          message: `Calificación en ${course}: ${String(score)}`,
          time: this.fmtRelativeTime(at),
          type: 'grade',
          ts: ts || 0,
        });
      }
    }

    const annSeen = new Set<string>();
    for (const a of dashboard.recentAnnouncements ?? []) {
      const o = a as Record<string, string>;
      const title = o['title'];
      if (!title) continue;
      const at = o['publishedAt'] ?? o['date'];
      const key = `d:${title}`;
      if (annSeen.has(key)) continue;
      annSeen.add(key);
      items.push({
        message: `Comunicado: ${title}`,
        time: this.fmtRelativeTime(at),
        type: 'announcement',
        ts: at ? new Date(at).getTime() : 0,
      });
    }

    for (const a of announcements.slice(0, 8)) {
      const key = `a:${a.id}`;
      if (annSeen.has(key)) continue;
      annSeen.add(key);
      items.push({
        message: `Comunicado: ${a.title}`,
        time: this.fmtRelativeTime(a.publishedAt),
        type: 'announcement',
        ts: new Date(a.publishedAt).getTime(),
      });
    }

    for (const t of tasks.slice(0, 6)) {
      if (!t.dueDate) continue;
      items.push({
        message: `Tarea: ${t.title}`,
        time: `Entrega ${this.fmtRelativeTime(t.dueDate)}`,
        type: 'task',
        ts: new Date(t.dueDate).getTime(),
      });
    }

    return items
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 15)
      .map(({ ts: _t, ...rest }) => rest);
  }

  /** Fila segura para enlazar comunicados del payload del dashboard. */
  previewAnnouncement(raw: unknown): { id: string; title: string; dateIso?: string } | null {
    const o = raw as Record<string, unknown>;
    const id = o?.['id'];
    const title = o?.['title'];
    if (typeof id !== 'string' || typeof title !== 'string') return null;
    const at = o?.['publishedAt'] ?? o?.['date'];
    const dateIso = typeof at === 'string' ? at : undefined;
    return { id, title, dateIso };
  }
}
