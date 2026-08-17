import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AdminService,
  TeacherItem,
  CourseItem,
  SectionItem,
  AcademicYearItem,
} from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';
import type { AdminTab } from '../_shared/components/tabs/admin-tabs.component';

interface CourseView {
  id: string;
  courseId: string;
  sectionId: string;
  name: string;
  code: string;
  level: string;
  grade: string;
  section: string;
  academicYear: string;
  students: number;
  classroom: string;
  isActive: boolean;
  createdAt?: string;
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
  coursesLoading = signal(false);
  courseHistory = signal<CourseView[]>([]);
  historyLoading = signal(false);
  showAssignCourseModal = signal(false);
  catalogCourses = signal<CourseItem[]>([]);
  sections = signal<SectionItem[]>([]);
  academicYears = signal<AcademicYearItem[]>([]);
  assignSaving = signal(false);
  assignError = signal('');

  private _historyYear = signal('');
  get historyYear(): string { return this._historyYear(); }
  set historyYear(v: string) { this._historyYear.set(v); }

  private _historyStatus = signal('');
  get historyStatus(): string { return this._historyStatus(); }
  set historyStatus(v: string) { this._historyStatus.set(v); }

  private _coursesGrade = signal('');
  get coursesGrade(): string { return this._coursesGrade(); }
  set coursesGrade(v: string) { this._coursesGrade.set(v); }

  private _selectedCourseId = signal('');
  get selectedCourseId(): string { return this._selectedCourseId(); }
  set selectedCourseId(v: string) { this._selectedCourseId.set(v); }

  private _selectedSectionId = signal('');
  get selectedSectionId(): string { return this._selectedSectionId(); }
  set selectedSectionId(v: string) { this._selectedSectionId.set(v); }

  private _selectedYearId = signal('');
  get selectedYearId(): string { return this._selectedYearId(); }
  set selectedYearId(v: string) {
    this._selectedYearId.set(v);
    const still = this.sectionsForYear().some(s => s.id === this._selectedSectionId());
    if (!still) this._selectedSectionId.set('');
  }

  sectionsForYear = computed(() => {
    const yearId = this._selectedYearId();
    return this.sections().filter(s => !yearId || s.academicYear?.id === yearId);
  });

  availableCoursesForAssignment = computed(() => {
    const sectionId = this._selectedSectionId();
    const assigned = new Set(
      this.activeCourses()
        .filter(c => !sectionId || c.sectionId === sectionId)
        .map(c => c.courseId)
        .filter(Boolean)
    );
    return this.catalogCourses().filter(c => c.id && !assigned.has(c.id));
  });

  selectedCourse = computed(() =>
    this.availableCoursesForAssignment().find(c => c.id === this._selectedCourseId()) ?? null
  );

  selectedSection = computed(() =>
    this.sections().find(s => s.id === this._selectedSectionId()) ?? null
  );

  canAssign = computed(() =>
    !!this._selectedCourseId() && !!this._selectedSectionId() && !!this._selectedYearId() && !this.assignSaving()
  );

  historyYears = computed(() =>
    Array.from(new Set(this.courseHistory().map(c => c.academicYear).filter(Boolean))).sort((a, b) => b.localeCompare(a, 'es'))
  );

  filteredHistory = computed(() => {
    const year = this._historyYear();
    const status = this._historyStatus();
    return this.courseHistory().filter(c => {
      if (year && c.academicYear !== year) return false;
      if (status === 'vigente' && !c.isActive) return false;
      if (status === 'cerrado' && c.isActive) return false;
      return true;
    });
  });

  historyByYear = computed(() => {
    const groups = new Map<string, CourseView[]>();
    for (const course of this.filteredHistory()) {
      const key = course.academicYear || 'Sin año';
      const list = groups.get(key) ?? [];
      list.push(course);
      groups.set(key, list);
    }
    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0], 'es'))
      .map(([year, courses]) => ({ year, courses }));
  });

  historyYearCount = computed(() => this.historyYears().length);
  historyActiveCount = computed(() => this.courseHistory().filter(c => c.isActive).length);

  courseGrades = computed(() =>
    Array.from(new Set(this.activeCourses().map(c => c.grade).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'))
  );

  filteredActiveCourses = computed(() => {
    const grade = this._coursesGrade();
    return this.activeCourses().filter(c => !grade || c.grade === grade);
  });

  coursesByGrade = computed(() => {
    const groups = new Map<string, CourseView[]>();
    for (const course of this.filteredActiveCourses()) {
      const key = course.grade || 'Sin grado';
      const list = groups.get(key) ?? [];
      list.push(course);
      groups.set(key, list);
    }
    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'es'))
      .map(([grade, courses]) => ({ grade, courses }));
  });

  activeCourseCount = computed(() => this.activeCourses().length);
  activeGradeCount = computed(() => this.courseGrades().length);
  activeStudentCount = computed(() =>
    this.activeCourses().reduce((sum, c) => sum + (c.students || 0), 0)
  );
  fichaLoadPreview = computed(() => this.activeCourses().slice(0, 6));

  constructor(private route: ActivatedRoute, private adminService: AdminService) {}

  ngOnInit() {
    this.teacherId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadTeacher();
    this.loadActiveCourses();
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
    this.coursesLoading.set(true);
    this.adminService.getTeacherActiveCourses(this.teacherId).subscribe({
      next: (data) => {
        this.activeCourses.set(this.normalizeCourses(data as Record<string, unknown>[]));
        this.coursesLoading.set(false);
      },
      error: () => this.coursesLoading.set(false),
    });
  }

  loadCourseHistory() {
    this.historyLoading.set(true);
    this.adminService.getTeacherCourseHistory(this.teacherId).subscribe({
      next: (data) => {
        this.courseHistory.set(this.normalizeCourses(data as Record<string, unknown>[]));
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
    });
  }

  private normalizeCourses(raw: Record<string, unknown>[]): CourseView[] {
    return (raw ?? []).map(c => {
      const course = (c['course'] as Record<string, unknown> | undefined) ?? c;
      const section = c['section'] as Record<string, unknown> | undefined;
      const year = (c['academicYear'] as Record<string, unknown> | undefined)
        ?? (section?.['academicYear'] as Record<string, unknown> | undefined);
      const count = section?.['_count'] as { enrollments?: number } | undefined;
      const schedule = (course['schedule'] ?? c['schedule'] ?? []) as Record<string, unknown>[];
      const assignmentId = String(c['id'] ?? '');
      const courseId = String(course['id'] ?? c['courseId'] ?? '');
      return {
        id: assignmentId || courseId,
        courseId,
        sectionId: String(c['sectionId'] ?? section?.['id'] ?? ''),
        name: String(course['name'] ?? '(sin nombre)'),
        code: String(course['code'] ?? ''),
        level: String(section?.['level'] ?? course['level'] ?? ''),
        grade: String(section?.['grade'] ?? course['grade'] ?? ''),
        section: String(section?.['name'] ?? ''),
        academicYear: String(year?.['name'] ?? course['academicYear'] ?? ''),
        students: Number(count?.enrollments ?? c['students'] ?? course['students'] ?? 0),
        classroom: String(course['classroom'] ?? c['classroom'] ?? ''),
        isActive: c['isActive'] !== false,
        createdAt: c['createdAt'] ? String(c['createdAt']) : undefined,
        schedule: Array.isArray(schedule) ? schedule.map(s => ({
          day: String(s['day'] ?? ''),
          time: String(s['time'] ?? (s['startTime'] && s['endTime'] ? `${s['startTime']} – ${s['endTime']}` : '')),
        })) : [],
      };
    });
  }

  getFullName(): string {
    const t = this.teacher();
    if (!t) return '';
    return (t.name ?? `${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`).trim();
  }

  firstName(): string {
    const t = this.teacher();
    return t?.user?.firstName || this.getFullName().split(' ')[0] || '—';
  }

  lastName(): string {
    const t = this.teacher();
    if (t?.user?.lastName) return t.user.lastName;
    const parts = this.getFullName().split(' ').slice(1);
    return parts.join(' ') || '—';
  }

  teacherEmail(): string {
    const t = this.teacher();
    return t?.email || t?.user?.email || '—';
  }

  teacherCode(): string {
    return this.teacher()?.teacherCode || '—';
  }

  teacherDni(): string {
    return this.teacher()?.dni || this.teacher()?.user?.dni || '';
  }

  teacherUsername(): string {
    return this.teacher()?.username || this.teacher()?.user?.username || '';
  }

  teacherSubtitle(): string {
    const code = this.teacherCode();
    return code && code !== '—' ? `Docente · ${code}` : 'Docente';
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

  scheduleLabel(course: CourseView): string {
    if (!course.schedule.length) return '—';
    return course.schedule
      .map(s => [s.day, s.time].filter(Boolean).join(' '))
      .filter(Boolean)
      .join(' · ');
  }

  assignmentStatus(course: CourseView): string {
    return course.isActive ? 'Vigente' : 'Cerrado';
  }

  sectionOptionLabel(section: SectionItem): string {
    const year = section.academicYear?.name ? ` · ${section.academicYear.name}` : '';
    return `${section.grade} ${section.name}${year}`.trim();
  }

  courseOptionLabel(course: CourseItem): string {
    return [course.name, course.grade, course.code].filter(Boolean).join(' · ');
  }

  onResetPassword() {
    const userId = this.teacher()?.user?.id;
    if (!userId) return;
    this.adminService.resetUserPassword(userId).subscribe({
      next: (res) => alert(`Contraseña temporal: ${res.tempPassword}`),
      error: () => alert('No se pudo resetear la contraseña'),
    });
  }

  unassignCourse(course: CourseView) {
    const where = [course.grade, course.section].filter(Boolean).join(' ');
    const label = where ? `${course.name} · ${where}` : course.name;
    if (!confirm(`¿Quitar ${label} de la carga de este docente?`)) return;
    this.adminService.unassignCourseFromTeacher(this.teacherId, course.id).subscribe({
      next: () => this.loadActiveCourses(),
      error: () => alert('No se pudo quitar el curso.'),
    });
  }

  openAssignCourseModal() {
    this.showAssignCourseModal.set(true);
    this.assignError.set('');
    this.assignSaving.set(false);
    this._selectedCourseId.set('');
    this._selectedSectionId.set('');
    forkJoin({
      courses: this.adminService.getCourses({ pageSize: 100 }),
      sections: this.adminService.getSections(),
      years: this.adminService.getAcademicYears(),
    }).subscribe({
      next: ({ courses, sections, years }) => {
        this.catalogCourses.set(courses.data);
        this.sections.set(sections.data);
        this.academicYears.set(years);
        const active = years.find(y => y.status === 'ACTIVE') ?? years[0];
        this.selectedYearId = active?.id ?? '';
      },
      error: () => this.assignError.set('No se pudieron cargar los datos para asignar.'),
    });
  }

  closeAssignCourseModal() {
    this.showAssignCourseModal.set(false);
    this._selectedCourseId.set('');
    this._selectedSectionId.set('');
    this.assignError.set('');
    this.assignSaving.set(false);
  }

  assignCourse() {
    if (!this.canAssign()) return;
    this.assignSaving.set(true);
    this.assignError.set('');
    this.adminService.assignCourseToTeacher(this.teacherId, {
      courseId: this.selectedCourseId,
      sectionId: this.selectedSectionId,
      academicYearId: this.selectedYearId,
    }).subscribe({
      next: () => {
        this.assignSaving.set(false);
        this.closeAssignCourseModal();
        this.loadActiveCourses();
      },
      error: (err) => {
        this.assignSaving.set(false);
        const msg = err?.error?.message;
        this.assignError.set(
          Array.isArray(msg) ? msg.join('. ') : (msg || 'No se pudo asignar el curso.')
        );
      },
    });
  }
}
