import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService, TeacherDashboard } from '../../../services/dashboard.service';
import { AuthService } from '../../../services/auth.service';
import { TeacherService, TeacherCourse } from '../../../services/teacher.service';

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
  specialty = signal('');

  teacherCourses = signal<TeacherCourse[]>([]);
  coursesLoading = signal(true);
  rosterCounts = signal<Record<string, number>>({});

  totalCourses = signal(0);
  totalStudents = signal(0);
  pendingGrading = signal(0);
  attendancePending = signal(0);

  hasAttention = computed(() =>
    this.pendingGrading() > 0 || this.attendancePending() > 0
  );

  shortcuts = [
    { label: 'Mis Cursos', link: '/profesor/cursos' },
    { label: 'Tareas', link: '/profesor/tareas' },
    { label: 'Calificaciones', link: '/profesor/notas' },
    { label: 'Asistencia', link: '/profesor/asistencia' },
    { label: 'Estudiantes', link: '/profesor/cursos' },
    { label: 'Comunicados', link: '/profesor/comunicados' },
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
    this.loadCourses();
  }

  loadDashboard() {
    this.loading.set(true);
    this.error.set('');

    this.dashboardService.getTeacherDashboard().subscribe({
      next: (data: TeacherDashboard) => {
        this.totalStudents.set(data.summary.totalStudents);
        this.pendingGrading.set(data.summary.pendingGrading);
        this.attendancePending.set(data.summary.attendancePending);
        if (data.teacher?.specialty) this.specialty.set(data.teacher.specialty);
        if (data.teacher?.name) this.teacherName.set(data.teacher.name);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el panel.');
        this.loading.set(false);
      }
    });
  }

  private loadCourses() {
    this.coursesLoading.set(true);
    this.teacherService.getCourses().subscribe({
      next: (list) => {
        this.teacherCourses.set(list);
        this.totalCourses.set(list.length);
        this.teacherService.getRosterCountsForCourses(list).subscribe({
          next: (map) => this.rosterCounts.set(map),
          error: () => this.rosterCounts.set({}),
        });
        this.coursesLoading.set(false);
      },
      error: () => {
        this.coursesLoading.set(false);
        this.totalCourses.set(0);
      }
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

  greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }
}
