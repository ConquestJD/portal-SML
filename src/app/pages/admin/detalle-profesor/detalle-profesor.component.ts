import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, TeacherItem } from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';
import type { AdminTab } from '../_shared/components/tabs/admin-tabs.component';

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
  activeTab = signal('perfil');
  teacherId = '';

  readonly tabs: AdminTab[] = [
    { id: 'perfil',    label: 'Perfil',              icon: 'fa-user' },
    { id: 'cursos',    label: 'Cursos activos',      icon: 'fa-book' },
    { id: 'historial', label: 'Historial de cursos', icon: 'fa-history' },
  ];

  teacher = signal<TeacherItem | null>(null);
  activeCourses = signal<unknown[]>([]);
  courseHistory = signal<unknown[]>([]);

  resetPassword() {
    if (!this.teacherId) return;
    this.adminService.resetUserPassword(this.teacherId).subscribe({
      next: (res) => alert(`Contraseña temporal: ${res.tempPassword}`),
      error: () => alert('No se pudo resetear la contraseña'),
    });
  }

  onResetPassword() { this.resetPassword(); }

  readonly finishedCourses = computed(() => this.courseHistory() as any[]);
  removeCourse(courseId: string) { this.unassignCourse(courseId); }

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

  selectTab(tab: string) {
    this.activeTab.set(tab);
    if (tab === 'cursos') this.loadActiveCourses();
    if (tab === 'historial') this.loadCourseHistory();
  }

  loadActiveCourses() {
    this.adminService.getTeacherActiveCourses(this.teacherId).subscribe({
      next: (data) => this.activeCourses.set(this.normalizeCourses(data as any[]))
    });
  }

  loadCourseHistory() {
    this.adminService.getTeacherCourseHistory(this.teacherId).subscribe({
      next: (data) => this.courseHistory.set(this.normalizeCourses(data as any[]))
    });
  }

  /** Acepta tanto cursos planos como objetos `TeacherAssignment` con `course` anidado. */
  private normalizeCourses(raw: any[]): any[] {
    return (raw ?? []).map(c => {
      const course = c?.course ?? c;
      const schedule = (course?.schedule ?? c?.schedule ?? []) as any[];
      return {
        id: course?.id ?? c?.courseId ?? c?.id ?? '',
        name: course?.name ?? '(sin nombre)',
        code: course?.code ?? '',
        level: course?.level ?? '',
        grade: course?.grade ?? c?.section?.grade ?? '',
        section: c?.section?.name ?? '',
        color: course?.color ?? c?.color ?? '',
        academicYear: c?.academicYear?.name ?? course?.academicYear ?? '',
        students: c?.students ?? course?.students ?? 0,
        classroom: course?.classroom ?? c?.classroom ?? '',
        startDate: c?.startDate ?? course?.startDate ?? null,
        endDate: c?.endDate ?? course?.endDate ?? null,
        schedule: schedule.map(s => ({
          day: s?.day ?? '',
          time: s?.time ?? (s?.startTime && s?.endTime ? `${s.startTime} – ${s.endTime}` : ''),
        })),
      };
    });
  }

  unassignCourse(courseId: string) {
    this.adminService.unassignCourseFromTeacher(this.teacherId, courseId).subscribe({
      next: () => this.loadActiveCourses()
    });
  }

  setTab(tab: string) { this.selectTab(tab); }
  getFullName(): string {
    const t = this.teacher();
    if (!t) return '';
    return t.name ?? `${t.user.firstName} ${t.user.lastName}`;
  }

  getHeroSubtitle(): string {
    const t = this.profesor();
    return t.department || t.specialty || 'Docente';
  }
  readonly profesor = computed(() => this.teacher() ?? {
    name: '', department: '', specialty: '', email: '', phone: '', status: '',
    teacherCode: '', bio: '',
    user: { id: '', email: '', firstName: '', lastName: '', status: '' }
  } as any);
  showAssignCourseModal = signal(false);
  availableCoursesForAssignment = signal<any[]>([]);

  private _selectedCourseId = signal('');
  get selectedCourseId(): string { return this._selectedCourseId(); }
  set selectedCourseId(v: string) { this._selectedCourseId.set(v); }

  readonly selectedCourse = computed(() =>
    this.availableCoursesForAssignment().find(c => c.id === this._selectedCourseId()) ?? null
  );

  getLevelLabel(level: string | undefined): string {
    const m: Record<string, string> = { inicial: 'Inicial', primaria: 'Primaria', secundaria: 'Secundaria' };
    return m[(level ?? '').toLowerCase()] ?? (level ?? '');
  }

  openAssignCourseModal() {
    this.showAssignCourseModal.set(true);
    this.adminService.getCourses({ pageSize: 100 }).subscribe({
      next: ({ data }) => this.availableCoursesForAssignment.set(data as any[]),
    });
  }
  closeAssignCourseModal() {
    this.showAssignCourseModal.set(false);
    this._selectedCourseId.set('');
  }

  assignCourse() {
    const course = this.selectedCourse();
    if (!course) return;
    const payload = {
      courseId: course.id,
      sectionId: course.sectionId ?? '',
      academicYearId: course.academicYearId ?? '',
    };
    this.adminService.assignCourseToTeacher(this.teacherId, payload).subscribe({
      next: () => {
        this.closeAssignCourseModal();
        this.loadActiveCourses();
      },
      error: () => alert('No se pudo asignar el curso. Faltan sección o año académico.'),
    });
  }
}
