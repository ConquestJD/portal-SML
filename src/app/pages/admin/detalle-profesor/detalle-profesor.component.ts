import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, TeacherItem } from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';
import type { AdminTab } from '../_shared/components/tabs/admin-tabs.component';

interface CourseView {
  id: string;
  name: string;
  code: string;
  level: string;
  grade: string;
  section: string;
  academicYear: string;
  students: number;
  classroom: string;
  schedule: { day: string; time: string }[];
}

@Component({
  selector: 'app-detalle-profesor',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, FormsModule, ...ADMIN_SHARED],
  templateUrl: './detalle-profesor.component.html',
  styleUrl: './detalle-profesor.component.css'
})
export class DetalleProfesorComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  activeTab = signal('ficha');
  teacherId = '';

  readonly tabs: AdminTab[] = [
    { id: 'ficha',     label: 'Ficha' },
    { id: 'cursos',    label: 'Cursos' },
    { id: 'historial', label: 'Historial' },
  ];

  teacher = signal<TeacherItem | null>(null);
  activeCourses = signal<CourseView[]>([]);
  courseHistory = signal<CourseView[]>([]);
  showAssignCourseModal = signal(false);
  allCourses = signal<CourseView[]>([]);

  private _selectedCourseId = signal('');
  get selectedCourseId(): string { return this._selectedCourseId(); }
  set selectedCourseId(v: string) { this._selectedCourseId.set(v); }

  availableCoursesForAssignment = computed(() => {
    const assigned = new Set(this.activeCourses().map(c => c.id));
    return this.allCourses().filter(c => c.id && !assigned.has(c.id));
  });

  selectedCourse = computed(() =>
    this.availableCoursesForAssignment().find(c => c.id === this._selectedCourseId()) ?? null
  );

  constructor(private route: ActivatedRoute, private adminService: AdminService) {}

  ngOnInit() {
    this.teacherId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadTeacher();
  }

  loadTeacher() {
    this.loading.set(true);
    this.adminService.getTeacher(this.teacherId).subscribe({
      next: (data) => { this.teacher.set(data); this.loading.set(false); },
      error: () => { this.error.set('No se pudo cargar el profesor'); this.loading.set(false); }
    });
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
    if (tab === 'cursos') this.loadActiveCourses();
    if (tab === 'historial') this.loadCourseHistory();
  }

  loadActiveCourses() {
    this.adminService.getTeacherActiveCourses(this.teacherId).subscribe({
      next: (data) => this.activeCourses.set(this.normalizeCourses(data as Record<string, unknown>[])),
    });
  }

  loadCourseHistory() {
    this.adminService.getTeacherCourseHistory(this.teacherId).subscribe({
      next: (data) => this.courseHistory.set(this.normalizeCourses(data as Record<string, unknown>[])),
    });
  }

  private normalizeCourses(raw: Record<string, unknown>[]): CourseView[] {
    return (raw ?? []).map(c => {
      const course = (c['course'] as Record<string, unknown> | undefined) ?? c;
      const section = c['section'] as Record<string, unknown> | undefined;
      const year = c['academicYear'] as Record<string, unknown> | undefined;
      const schedule = (course['schedule'] ?? c['schedule'] ?? []) as Record<string, unknown>[];
      return {
        id: String(course['id'] ?? c['courseId'] ?? c['id'] ?? ''),
        name: String(course['name'] ?? '(sin nombre)'),
        code: String(course['code'] ?? ''),
        level: String(course['level'] ?? ''),
        grade: String(course['grade'] ?? section?.['grade'] ?? ''),
        section: String(section?.['name'] ?? ''),
        academicYear: String(year?.['name'] ?? course['academicYear'] ?? ''),
        students: Number(c['students'] ?? course['students'] ?? 0),
        classroom: String(course['classroom'] ?? c['classroom'] ?? ''),
        schedule: schedule.map(s => ({
          day: String(s['day'] ?? ''),
          time: String(s['time'] ?? (s['startTime'] && s['endTime'] ? `${s['startTime']} – ${s['endTime']}` : '')),
        })),
      };
    });
  }

  getFullName(): string {
    const t = this.teacher();
    if (!t) return '';
    return (t.name ?? `${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`).trim();
  }

  teacherEmail(): string {
    const t = this.teacher();
    return t?.email || t?.user?.email || '—';
  }

  specialty(): string {
    const t = this.teacher();
    return t?.specialty || t?.department || 'Docente';
  }

  teacherCode(): string {
    return this.teacher()?.teacherCode || '—';
  }

  getLevelLabel(level: string | undefined): string {
    const m: Record<string, string> = { inicial: 'Inicial', primaria: 'Primaria', secundaria: 'Secundaria' };
    return m[(level ?? '').toLowerCase()] ?? (level ?? '');
  }

  courseMeta(course: CourseView): string {
    return [
      course.code,
      this.getLevelLabel(course.level),
      [course.grade, course.section].filter(Boolean).join(' '),
      course.academicYear,
    ].filter(Boolean).join(' · ');
  }

  onResetPassword() {
    const userId = this.teacher()?.user?.id;
    if (!userId) return;
    this.adminService.resetUserPassword(userId).subscribe({
      next: (res) => alert(`Contraseña temporal: ${res.tempPassword}`),
      error: () => alert('No se pudo resetear la contraseña'),
    });
  }

  unassignCourse(courseId: string) {
    this.adminService.unassignCourseFromTeacher(this.teacherId, courseId).subscribe({
      next: () => this.loadActiveCourses(),
    });
  }

  openAssignCourseModal() {
    this.showAssignCourseModal.set(true);
    this._selectedCourseId.set('');
    this.adminService.getCourses({ pageSize: 100 }).subscribe({
      next: ({ data }) => this.allCourses.set(
        data.map(c => ({
          id: c.id,
          name: c.name,
          code: c.code,
          level: c.level ?? '',
          grade: c.grade ?? '',
          section: '',
          academicYear: '',
          students: c.students ?? 0,
          classroom: c.classroom ?? '',
          schedule: (c.schedule ?? []).map(s => ({
            day: s.day,
            time: s.startTime && s.endTime ? `${s.startTime} – ${s.endTime}` : '',
          })),
        }))
      ),
    });
  }

  closeAssignCourseModal() {
    this.showAssignCourseModal.set(false);
    this._selectedCourseId.set('');
  }

  assignCourse() {
    const course = this.selectedCourse();
    if (!course) return;
    const raw = this.allCourses().find(c => c.id === course.id) as CourseView & { sectionId?: string; academicYearId?: string } | undefined;
    this.adminService.assignCourseToTeacher(this.teacherId, {
      courseId: course.id,
      sectionId: raw?.sectionId ?? '',
      academicYearId: raw?.academicYearId ?? '',
    }).subscribe({
      next: () => {
        this.closeAssignCourseModal();
        this.loadActiveCourses();
      },
      error: () => alert('No se pudo asignar el curso. Faltan sección o año académico.'),
    });
  }
}
