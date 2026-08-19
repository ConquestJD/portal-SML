import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DashboardService, TeacherDashboard } from '../../../services/dashboard.service';
import { AuthService } from '../../../services/auth.service';
import {
  TeacherActivityItem,
  TeacherCourse,
  TeacherService,
} from '../../../services/teacher.service';

@Component({
  selector: 'app-dashboard-profesor',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-profesor.component.html',
  styleUrl: './dashboard-profesor.component.css'
})
export class DashboardProfesorComponent implements OnInit {
  loading = signal(true);
  error = signal('');

  teacherName = signal('Profesor');
  firstName = computed(() => this.teacherName().trim().split(/\s+/)[0] || 'Profesor');

  teacherCourses = signal<TeacherCourse[]>([]);
  rosterCounts = signal<Record<string, number>>({});
  recentActivity = signal<TeacherActivityItem[]>([]);

  totalCourses = signal(0);
  totalStudents = signal(0);
  pendingGrading = signal(0);
  attendancePending = signal(0);
  unreadComunicados = signal(0);

  previewCourses = computed(() => this.teacherCourses().slice(0, 6));
  previewActivity = computed(() => this.recentActivity().slice(0, 6));

  hasAttention = computed(() =>
    this.pendingGrading() > 0 || this.attendancePending() > 0 || this.unreadComunicados() > 0
  );

  censusLine = computed(() => {
    const courses = this.totalCourses();
    const students = this.totalStudents();
    const courseLabel = courses === 1 ? '1 curso' : `${courses} cursos`;
    const studentLabel = students === 1 ? '1 estudiante' : `${students} estudiantes`;
    if (!courses) return 'Sin cursos asignados aún';
    return `${courseLabel} · ${studentLabel} en lista`;
  });

  directory = [
    { label: 'Cursos', hint: 'Aulas a tu cargo', link: '/profesor/cursos', photo: '/images/heroes/courses.webp' },
    { label: 'Actividad', hint: 'Entregas y publicaciones', link: '/profesor/actividad', photo: '/images/heroes/tasks.webp' },
    { label: 'Comunicados', hint: 'Mural del aula', link: '/profesor/comunicados', photo: '/images/heroes/announcements.webp' },
    { label: 'Mensajería', hint: 'Correspondencia', link: '/profesor/mensajeria', photo: '/images/heroes/messages.webp' },
  ];

  actions = [
    { label: 'Abrir mis cursos', hint: 'Tareas, notas y material', link: '/profesor/cursos' },
    { label: 'Revisar actividad', hint: 'Entregas recientes', link: '/profesor/actividad' },
    { label: 'Publicar comunicado', hint: 'Aviso a las familias', link: '/profesor/comunicados' },
    { label: 'Escribir un mensaje', hint: 'Correspondencia del aula', link: '/profesor/mensajeria' },
  ];

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private teacherService: TeacherService
  ) {}

  ngOnInit() {
    const user = this.authService.user();
    if (user) this.teacherName.set(user.name);
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      dash: this.dashboardService.getTeacherDashboard().pipe(
        catchError(() => of(null as TeacherDashboard | null)),
      ),
      courses: this.teacherService.getCourses().pipe(
        catchError(() => of([] as TeacherCourse[])),
      ),
      activity: this.teacherService.getActivity().pipe(
        catchError(() => of([] as TeacherActivityItem[])),
      ),
    }).subscribe(({ dash, courses, activity }) => {
      if (!dash) {
        this.error.set('No se pudo cargar el panel.');
        this.loading.set(false);
        return;
      }

      this.totalStudents.set(dash.summary.totalStudents);
      this.pendingGrading.set(dash.summary.pendingGrading);
      this.attendancePending.set(dash.summary.attendancePending);
      this.unreadComunicados.set(dash.summary.unreadComunicados ?? 0);
      if (dash.teacher?.name) this.teacherName.set(dash.teacher.name);

      this.teacherCourses.set(courses);
      this.totalCourses.set(courses.length);
      this.recentActivity.set(activity ?? []);

      if (courses.length) {
        this.teacherService.getRosterCountsForCourses(courses).subscribe({
          next: map => this.rosterCounts.set(map),
          error: () => this.rosterCounts.set({}),
        });
      } else {
        this.rosterCounts.set({});
      }

      this.loading.set(false);
    });
  }

  courseLink(c: TeacherCourse): string[] {
    return ['/profesor/cursos', c.id];
  }

  courseSubtitle(c: TeacherCourse): string {
    const grade = (c.course?.grade ?? '').trim();
    const level = (c.course?.level ?? '').trim();
    return [grade, level].filter(Boolean).join(' · ');
  }

  courseInitial(c: TeacherCourse): string {
    const name = (c.course?.name ?? '').trim();
    return name ? name.charAt(0).toUpperCase() : '·';
  }

  courseColor(c: TeacherCourse): string {
    return (c.course?.color || '').trim() || '#003366';
  }

  rosterStudentCount(c: TeacherCourse): number {
    const n = this.rosterCounts()[c.id];
    if (n !== undefined) return n;
    return c.studentsCount ?? c.students ?? 0;
  }

  rosterLabel(c: TeacherCourse): string {
    const n = this.rosterStudentCount(c);
    return n === 1 ? '1 estudiante' : `${n} estudiantes`;
  }

  kindLabel(kind: TeacherActivityItem['kind']): string {
    if (kind === 'submission') return 'Entrega';
    if (kind === 'late') return 'Tarde';
    if (kind === 'graded') return 'Calificada';
    if (kind === 'task') return 'Tarea';
    if (kind === 'material') return 'Material';
    if (kind === 'announcement') return 'Comunicado';
    return 'Examen';
  }

  activityLink(item: TeacherActivityItem): string[] {
    if ((item.kind === 'submission' || item.kind === 'late' || item.kind === 'graded') && item.taskId) {
      return ['/profesor/cursos', item.courseId, 'tareas', item.taskId, 'revisar'];
    }
    if (item.kind === 'task' && item.taskId) {
      return ['/profesor/cursos', item.courseId, 'tareas', item.taskId];
    }
    if (item.kind === 'material' && item.materialId) {
      return ['/profesor/cursos', item.courseId, 'materiales', item.materialId];
    }
    if (item.kind === 'announcement' && item.announcementId) {
      return ['/profesor/cursos', item.courseId, 'comunicados', item.announcementId];
    }
    if (item.kind === 'exam' && item.examId) {
      return ['/profesor/cursos', item.courseId, 'examenes', item.examId];
    }
    return ['/profesor/cursos', item.courseId];
  }

  activityTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const min = Math.round(diff / 60000);
    if (min < 1) return 'Ahora';
    if (min < 60) return `Hace ${min} min`;
    const hrs = Math.round(min / 60);
    if (hrs < 24) return `Hace ${hrs} h`;
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
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

  private capitalize(value: string): string {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
