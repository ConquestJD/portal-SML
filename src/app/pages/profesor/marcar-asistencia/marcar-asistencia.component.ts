import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  TeacherService,
  AttendanceRecord,
  TeacherCourse,
  filterTeacherRosterByCourseGrade,
} from '../../../services/teacher.service';
import {
  findActiveScheduleSlot,
  isAttendanceWindowOpen,
  formatScheduleSummary,
  CourseScheduleSlot,
} from '../_utils/course-attendance-window.util';

type UiStatus = 'presente' | 'tarde' | 'falta';

interface StudentRow {
  id: string;
  name: string;
  code: string;
}

@Component({
  selector: 'app-marcar-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './marcar-asistencia.component.html',
  styleUrl: './marcar-asistencia.component.css',
})
export class MarcarAsistenciaComponent implements OnInit, OnDestroy {
  courseId = signal('');
  course = signal<TeacherCourse | null>(null);
  /** Siempre la fecha local de hoy (sesión actual). */
  attendanceDate = signal(MarcarAsistenciaComponent.todayLocalISODate());
  loading = signal(true);
  isSaving = signal(false);
  error = signal('');
  success = signal('');

  students = signal<StudentRow[]>([]);
  /** Estado por id de estudiante. */
  attendanceState = signal<Record<string, { status: UiStatus | null; notes: string }>>({});

  /** Ventana horaria: se recalcula cada minuto. */
  withinWindow = signal(false);
  activeSlot = signal<CourseScheduleSlot | null>(null);
  nowTick = signal(0);

  private windowTimer?: ReturnType<typeof setInterval>;

  readonly isLoading = this.loading;

  attendanceSummary = computed(() => {
    const state = this.attendanceState();
    let present = 0;
    let late = 0;
    let absent = 0;
    let unmarked = 0;
    for (const s of this.students()) {
      const st = state[s.id]?.status;
      if (st === 'presente') present++;
      else if (st === 'tarde') late++;
      else if (st === 'falta') absent++;
      else unmarked++;
    }
    return { present, late, absent, unmarked, total: this.students().length };
  });

  scheduleSummaryText = computed(() =>
    formatScheduleSummary(this.course()?.course?.schedule ?? null)
  );

  todayLabel = computed(() => {
    this.nowTick();
    const [y, m, d] = this.attendanceDate().split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  courseHeaderSubtitle = computed(() => {
    const c = this.course();
    if (!c?.course) return '';
    const g = (c.course.grade ?? '').trim();
    const l = (c.course.level ?? '').trim();
    if (g && l) return `${g} · ${l}`;
    return g || l || '';
  });

  canInteract = computed(() => this.withinWindow() && this.students().length > 0);

  canSave = computed(() => {
    if (!this.withinWindow() || !this.students().length) return false;
    return this.attendanceSummary().unmarked === 0;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teacherService: TeacherService
  ) {}

  private static todayLocalISODate(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  ngOnInit() {
    this.courseId.set(this.route.snapshot.paramMap.get('courseId') ?? '');
    this.refreshWindowState();
    this.windowTimer = setInterval(() => {
      this.nowTick.update(n => n + 1);
      this.refreshWindowState();
    }, 30_000);
    this.loadAll();
  }

  ngOnDestroy() {
    if (this.windowTimer) clearInterval(this.windowTimer);
  }

  private refreshWindowState() {
    const c = this.course();
    const sched = c?.course?.schedule as CourseScheduleSlot[] | null | undefined;
    const at = new Date();
    this.activeSlot.set(findActiveScheduleSlot(sched, at));
    this.withinWindow.set(isAttendanceWindowOpen(sched, at));
  }

  private loadAll() {
    const cid = this.courseId();
    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    this.teacherService.getCourse(cid).subscribe({
      next: (course) => {
        this.course.set(course);
        this.refreshWindowState();
        const grade = (course.course?.grade ?? '').trim();
        const level = (course.course?.level ?? '').trim();
        this.teacherService
          .getStudentsInCourse(cid, {
            ...(grade ? { grade } : {}),
            ...(level ? { level } : {}),
          })
          .subscribe({
            next: (data: unknown[]) => {
              const rows = filterTeacherRosterByCourseGrade(data, grade, level) as any[];
              this.applyLoadedStudents(rows);
            },
            error: () => {
              this.error.set('Error al cargar estudiantes');
              this.loading.set(false);
            },
          });
      },
      error: () => {
        this.error.set('Error al cargar el curso');
        this.loading.set(false);
      },
    });
  }

  private applyLoadedStudents(data: any[]) {
    const list: StudentRow[] = (data ?? []).map(s => {
      const st = s?.student ?? s;
      const u = st?.user ?? s?.user ?? {};
      const id = st?.id ?? s?.studentId ?? s?.id ?? '';
      return {
        id,
        name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || st?.name || '(sin nombre)',
        code: st?.studentCode ?? s?.studentCode ?? '',
      };
    });

    const init: Record<string, { status: UiStatus | null; notes: string }> = {};
    for (const r of list) init[r.id] = { status: null, notes: '' };

    this.students.set(list);
    this.attendanceState.set(init);
    this.loading.set(false);
    this.loadExistingAttendance();
  }

  private loadExistingAttendance() {
    const date = this.attendanceDate();
    this.teacherService.getAttendanceByDate(this.courseId(), date).subscribe({
      next: (existing: any[]) => {
        if (!existing?.length) return;
        this.attendanceState.update(prev => {
          const next = { ...prev };
          for (const e of existing) {
            const sid = e.student?.id ?? e.studentId;
            if (!sid || !next[sid]) continue;
            const ui = this.apiStatusToUi(e.status);
            if (ui)
              next[sid] = {
                status: ui,
                notes: e.notes ?? next[sid].notes ?? '',
              };
          }
          return next;
        });
      },
    });
  }

  private apiStatusToUi(s: string): UiStatus | null {
    const u = (s ?? '').toUpperCase();
    if (u === 'PRESENT') return 'presente';
    if (u === 'LATE') return 'tarde';
    if (u === 'ABSENT' || u === 'JUSTIFIED') return 'falta';
    return null;
  }

  private uiStatusToApi(s: UiStatus): AttendanceRecord['status'] {
    switch (s) {
      case 'presente':
        return 'PRESENT';
      case 'tarde':
        return 'LATE';
      case 'falta':
        return 'ABSENT';
    }
  }

  getAttendanceStatus(id: string): UiStatus | undefined {
    const st = this.attendanceState()[id]?.status;
    return st ?? undefined;
  }

  getObservation(id: string): string {
    return this.attendanceState()[id]?.notes ?? '';
  }

  setAttendance(id: string, status: UiStatus) {
    if (!this.canInteract()) return;
    this.attendanceState.update(prev => ({
      ...prev,
      [id]: { ...prev[id], status },
    }));
  }

  updateObservation(id: string, notes: string) {
    if (!this.canInteract()) return;
    this.attendanceState.update(prev => ({
      ...prev,
      [id]: { ...prev[id], notes },
    }));
  }

  markAllPresent() {
    if (!this.canInteract()) return;
    this.attendanceState.update(prev => {
      const next = { ...prev };
      for (const s of this.students()) {
        next[s.id] = { ...next[s.id], status: 'presente' };
      }
      return next;
    });
  }

  markAllAbsent() {
    if (!this.canInteract()) return;
    this.attendanceState.update(prev => {
      const next = { ...prev };
      for (const s of this.students()) {
        next[s.id] = { ...next[s.id], status: 'falta' };
      }
      return next;
    });
  }

  clearAll() {
    if (!this.canInteract()) return;
    this.attendanceState.update(prev => {
      const next = { ...prev };
      for (const s of this.students()) {
        next[s.id] = { status: null, notes: '' };
      }
      return next;
    });
  }

  getStatusBadgeClass(status: UiStatus): string {
    if (status === 'presente') return 'badge-success';
    if (status === 'tarde') return 'badge-warning';
    return 'badge-error';
  }

  getStatusLabel(status: UiStatus): string {
    if (status === 'presente') return 'Presente';
    if (status === 'tarde') return 'Tarde';
    return 'Falta';
  }

  cancel() {
    this.router.navigate(['/profesor/cursos', this.courseId()]);
  }

  saveAttendance() {
    if (!this.canSave() || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set('');
    const records: AttendanceRecord[] = this.students().map(s => {
      const st = this.attendanceState()[s.id]?.status!;
      return {
        studentId: s.id,
        date: this.attendanceDate(),
        status: this.uiStatusToApi(st),
        notes: this.attendanceState()[s.id]?.notes || undefined,
      };
    });

    this.teacherService.saveAttendance(this.courseId(), records).subscribe({
      next: () => {
        this.success.set('Asistencia guardada correctamente');
        this.isSaving.set(false);
        setTimeout(() => this.router.navigate(['/profesor/cursos', this.courseId()]), 1500);
      },
      error: (err) => {
        const msg = err?.error?.error?.message;
        this.error.set(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Error al guardar asistencia');
        this.isSaving.set(false);
      },
    });
  }
}
