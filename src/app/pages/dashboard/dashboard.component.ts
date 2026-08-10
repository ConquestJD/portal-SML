import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  error = signal('');

  studentName = signal('');
  firstName = computed(() => this.studentName().trim().split(/\s+/)[0] || 'Estudiante');
  grade = signal('');
  section = signal('');
  studentCode = signal('');
  currentPeriod = signal('');

  pendingTasks = signal(0);
  presentCount = signal(0);
  absentCount = signal(0);
  lateCount = signal(0);
  recentAnnouncements = signal<unknown[]>([]);

  averageGrade = signal<string | number>('—');
  upcomingEvaluationsCount = signal(0);
  newCommunications = signal(0);
  heroBanner = signal<DashboardHeroBanner | null>(null);
  alerts = signal<{ type: string; message: string; link: string }[]>([]);
  upcomingEvaluationsList = signal<UpcomingEvalItem[]>([]);
  enrolledCourses = signal<StudentCourse[]>([]);

  hasAttention = computed(() =>
    !!this.heroBanner() ||
    this.newCommunications() > 0 ||
    this.alerts().length > 0 ||
    (!this.heroBanner() && this.pendingTasks() > 0)
  );

  shortcuts = [
    { label: 'Mis Cursos', link: '/cursos' },
    { label: 'Tareas', link: '/tareas' },
    { label: 'Notas', link: '/notas' },
    { label: 'Asistencia', link: '/asistencia' },
    { label: 'Comunicados', link: '/comunicados' },
    { label: 'Perfil', link: '/perfil' },
  ];

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private studentService: StudentService,
    private announcementService: AnnouncementService,
  ) {}

  ngOnInit() {
    const user = this.authService.user();
    if (user) this.studentName.set(user.name);
    this.loadAll();
  }

  reload() {
    this.loadAll();
  }

  private loadAll() {
    this.loading.set(true);
    this.error.set('');

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
        this.error.set('No se pudo cargar el panel.');
        this.loading.set(false);
        return;
      }

      this.studentName.set(dashboard.student.name);
      const gl = dashboard.student.gradeLabel?.trim();
      const g = (dashboard.student.grade ?? '').trim();
      const lv = (dashboard.student.level ?? '').trim();
      this.grade.set((gl || [g, lv].filter(Boolean).join(' · ')).trim());
      this.section.set(dashboard.student.section ?? '');
      this.studentCode.set(dashboard.student.studentCode);
      this.currentPeriod.set(dashboard.student.academicYear ?? '');
      this.pendingTasks.set(dashboard.summary.pendingTasks);
      const att = dashboard.summary.attendanceSummary;
      this.presentCount.set(att['PRESENT'] ?? 0);
      this.absentCount.set(att['ABSENT'] ?? 0);
      this.lateCount.set(att['LATE'] ?? 0);
      this.recentAnnouncements.set(dashboard.recentAnnouncements);

      this.enrolledCourses.set(courses);
      this.averageGrade.set(this.computeAverageGrade(dashboard.recentGrades, grades));

      const upcoming = this.buildUpcomingFromTasks(tasks);
      this.upcomingEvaluationsList.set(upcoming);
      this.upcomingEvaluationsCount.set(upcoming.length);

      const ann = announcements.data ?? [];
      this.newCommunications.set(ann.filter(a => !a.isRead).length);

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
      } else {
        this.heroBanner.set(null);
      }

      this.loading.set(false);
    });
  }

  get attendancePercentage(): number {
    const total = this.presentCount() + this.absentCount() + this.lateCount();
    if (!total) return 0;
    return Math.round((this.presentCount() / total) * 100);
  }

  greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  courseInitial(c: StudentCourse): string {
    const name = (c.name ?? c.course?.name ?? '').trim();
    return name ? name.charAt(0).toUpperCase() : '·';
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  }

  previewAnnouncement(raw: unknown): { id: string; title: string; dateIso?: string } | null {
    const o = raw as Record<string, unknown>;
    const id = o?.['id'];
    const title = o?.['title'];
    if (typeof id !== 'string' || typeof title !== 'string') return null;
    const at = o?.['publishedAt'] ?? o?.['date'];
    const dateIso = typeof at === 'string' ? at : undefined;
    return { id, title, dateIso };
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
}
