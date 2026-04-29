import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, Observable } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import {
  AdminService,
  AcademicYearItem,
  AssignmentItem,
  ScheduleSlot,
  TeacherItem,
} from '../../../services/admin.service';
import { AdminTeacherSearchComboboxComponent } from '../_shared/components/teacher-search-combobox/admin-teacher-search-combobox.component';

@Component({
  selector: 'app-crear-curso',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTeacherSearchComboboxComponent],
  templateUrl: './crear-curso.component.html',
  styleUrl: './crear-curso.component.css'
})
export class CrearCursoComponent implements OnInit {
  isEditMode = signal(false);
  courseId = signal('');
  isLoading = signal(false);
  error = signal('');
  success = signal('');
  scheduleError = signal('');

  teachers = signal<TeacherItem[]>([]);
  /** Profesor que tenía asignación activa al abrir la edición (DELETE antes de reasignar). */
  initialAssignmentTeacherId = signal('');

  pageTitle = computed(() => this.isEditMode() ? 'Editar Curso' : 'Crear Curso');
  pageSubtitle = computed(() => this.isEditMode() ? 'Modifica los datos del curso' : 'Completa los datos del nuevo curso');

  academicYears = signal<AcademicYearItem[]>([]);
  readonly weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  readonly colorPalette = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
    '#f97316', '#6366f1', '#14b8a6', '#a855f7'
  ];

  readonly calendarStartHour = 7;
  readonly calendarEndHour = 18;
  readonly hourSlots = computed(() => {
    const slots: string[] = [];
    for (let h = this.calendarStartHour; h <= this.calendarEndHour; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
    }
    return slots;
  });

  scheduleDraft = signal<{ day: string; startTime: string; endTime: string }>({
    day: '',
    startTime: '',
    endTime: ''
  });

  formData = signal({
    name: '',
    code: '',
    level: '',
    grade: '',
    academicYearId: '',
    color: this.colorPalette[0],
    schedule: [] as ScheduleSlot[],
    teacherId: '',
  });

  availableGrades = computed(() => {
    const level = this.formData().level;
    if (level === 'secundaria') return ['1ro Secundaria', '2do Secundaria', '3ro Secundaria', '4to Secundaria', '5to Secundaria'];
    if (level === 'primaria')   return ['1ro Primaria', '2do Primaria', '3ro Primaria', '4to Primaria', '5to Primaria', '6to Primaria'];
    if (level === 'inicial')    return ['3 años', '4 años', '5 años'];
    return [];
  });

  hasSchedule = computed(() => this.formData().schedule.length > 0);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService
  ) {}

  ngOnInit() {
    this.adminService.getTeachers({ pageSize: 100 }).subscribe({
      next: ({ data }) => this.teachers.set(data),
      error: () => this.teachers.set([])
    });

    this.adminService.getAcademicYears().subscribe({
      next: (years) => {
        this.academicYears.set(years);
        const active = years.find(y => y.status === 'ACTIVE') ?? years[0];
        if (active && !this.formData().academicYearId) {
          this.formData.update(d => ({ ...d, academicYearId: active.id }));
        }
      }
    });

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode.set(true);
        this.courseId.set(params['id']);
        this.loadCourse(params['id']);
      }
    });
  }

  private mapLevelToApi(levelKey: string): string {
    const m: Record<string, string> = { inicial: 'Inicial', primaria: 'Primaria', secundaria: 'Secundaria' };
    return m[levelKey] ?? levelKey;
  }

  loadCourse(id: string) {
    forkJoin({
      course: this.adminService.getCourse(id),
      assignments: this.adminService.getTeacherAssignments({ page: 1, pageSize: 100 }),
    }).subscribe({
      next: ({ course, assignments }) => {
        const a = assignments.data.find((x: AssignmentItem) =>
          x.course?.id === id && x.isActive !== false
        );

        const rawLevel = (course.level ?? '').toLowerCase();
        const lvl = rawLevel.includes('secund')
          ? 'secundaria'
          : rawLevel.includes('prim')
            ? 'primaria'
            : rawLevel.includes('inic')
              ? 'inicial'
              : '';

        this.formData.update(fd => ({
          ...fd,
          name: course.name,
          code: course.code,
          level: lvl || fd.level,
          grade: course.grade ?? '',
          schedule: course.schedule ?? [],
          color: course.color ?? this.colorPalette[0],
          academicYearId: a?.academicYear?.id ?? fd.academicYearId,
          teacherId: a?.teacher?.id ?? '',
        }));

        if (a?.teacher?.id) this.initialAssignmentTeacherId.set(a.teacher.id);
        else this.initialAssignmentTeacherId.set('');
      },
      error: () => this.error.set('No se pudo cargar el curso')
    });
  }

  onLevelChange() {
    this.formData.update(d => ({ ...d, grade: '' }));
  }

  generateCode() {
    const d = this.formData();
    if (!d.name || !d.grade) return;
    const code = (d.grade.substring(0, 3) + '-' + d.name.substring(0, 3)).toUpperCase().replace(/\s/g, '');
    this.formData.update(f => ({ ...f, code }));
  }

  selectColor(color: string) {
    this.formData.update(f => ({ ...f, color }));
  }

  updateScheduleDraft(field: 'day' | 'startTime' | 'endTime', value: string) {
    this.scheduleDraft.update(d => ({ ...d, [field]: value }));
  }

  addScheduleBlock() {
    this.scheduleError.set('');
    const d = this.scheduleDraft();

    if (!d.day) {
      this.scheduleError.set('Selecciona un día');
      return;
    }
    if (!d.startTime || !d.endTime) {
      this.scheduleError.set('Completa hora de inicio y hora de fin');
      return;
    }
    if (d.startTime >= d.endTime) {
      this.scheduleError.set('La hora de inicio debe ser menor que la hora de fin');
      return;
    }

    const overlaps = this.formData().schedule.some(s =>
      s.day === d.day && !(d.endTime <= s.startTime || d.startTime >= s.endTime)
    );
    if (overlaps) {
      this.scheduleError.set(`Ya hay un bloque en ${d.day} que se cruza con ese horario`);
      return;
    }

    const newBlock: ScheduleSlot = { day: d.day, startTime: d.startTime, endTime: d.endTime };
    this.formData.update(f => ({ ...f, schedule: [...f.schedule, newBlock] }));
    this.scheduleDraft.set({ day: '', startTime: '', endTime: '' });
  }

  removeScheduleBlock(block: ScheduleSlot) {
    this.formData.update(f => ({
      ...f,
      schedule: f.schedule.filter(s => !(s.day === block.day && s.startTime === block.startTime && s.endTime === block.endTime))
    }));
  }

  clearAllSchedule() {
    this.formData.update(f => ({ ...f, schedule: [] }));
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  private calendarStartMinutes(): number { return this.calendarStartHour * 60; }

  getBlockTop(startTime: string): number {
    return Math.max(0, this.timeToMinutes(startTime) - this.calendarStartMinutes());
  }

  getBlockHeight(startTime: string, endTime: string): number {
    return Math.max(20, this.timeToMinutes(endTime) - this.timeToMinutes(startTime));
  }

  getBlocksForDay(day: string): ScheduleSlot[] {
    return this.formData().schedule
      .filter(s => s.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  onSubmit() {
    this.isLoading.set(true);
    this.error.set('');
    this.success.set('');
    const d = this.formData();

    if (!d.name || !d.code || !d.level || !d.grade) {
      this.error.set('Completa nombre, código, nivel y grado');
      this.isLoading.set(false);
      return;
    }

    if (!d.teacherId) {
      this.error.set('Selecciona el profesor del curso.');
      this.isLoading.set(false);
      return;
    }

    if (!d.academicYearId) {
      this.error.set('Selecciona el año académico para registrar la asignación del profesor.');
      this.isLoading.set(false);
      return;
    }

    const dto = {
      name: d.name,
      code: d.code,
      grade: d.grade,
      level: this.mapLevelToApi(d.level),
      schedule: d.schedule,
      color: d.color
    };

    const base$ = this.isEditMode()
      ? this.adminService.updateCourse(this.courseId(), dto)
      : this.adminService.createCourse(dto);

    const wasCreate = !this.isEditMode();

    base$.pipe(
      switchMap(course =>
        this.syncTeacherAssignment(course.id).pipe(
          map(result => ({ course, result }))
        )
      ),
      catchError(err => {
        this.error.set(this.extractApiMessage(err) || 'Error al guardar el curso');
        this.isLoading.set(false);
        throw err;
      })
    ).subscribe({
      next: ({ course, result }) => {
        this.isLoading.set(false);

        if (result.ok === false) {
          this.error.set(result.message);
          if (wasCreate) {
            this.isEditMode.set(true);
            this.courseId.set(course.id);
          }
          return;
        }

        this.initialAssignmentTeacherId.set(this.formData().teacherId || '');
        this.router.navigate(['/admin/cursos']);
      },
      error: () => {},
    });
  }

  private syncTeacherAssignment(
    courseId: string
  ): Observable<{ ok: true } | { ok: false; message: string }> {
    const d = this.formData();
    const prevTeacher = this.initialAssignmentTeacherId();
    const wantsAssign = !!(d.teacherId && d.academicYearId);

    const unassignPrev$ = prevTeacher
      ? this.adminService.unassignCourseFromTeacher(prevTeacher, courseId).pipe(catchError(() => of(null)))
      : of(null);

    return unassignPrev$.pipe(
      switchMap(() => {
        if (!wantsAssign || !d.teacherId) {
          return of({ ok: true } as const);
        }

        return this.resolveSectionId(d.grade, d.level, d.academicYearId).pipe(
          switchMap(sectionId =>
            this.adminService.assignCourseToTeacher(d.teacherId, {
              courseId,
              academicYearId: d.academicYearId,
              ...(sectionId ? { sectionId } : {}),
            })
          ),
          map(() => ({ ok: true } as const)),
          catchError(err => {
            const apiMsg = this.extractApiMessage(err);
            const message = apiMsg
              ? `El curso se guardó, pero no se pudo registrar al profesor: ${apiMsg}.`
              : 'El curso se guardó, pero no se pudo registrar al profesor. Reintenta o gestiónalo desde "Asignación docente".';
            return of({ ok: false, message } as const);
          })
        );
      })
    );
  }

  /** Busca la sección que mejor encaja con grado/nivel/año para no exponer el campo en la UI. */
  private resolveSectionId(grade: string, levelKey: string, academicYearId: string): Observable<string | null> {
    const levelApi = this.mapLevelToApi(levelKey).toLowerCase();
    return this.adminService.getSections({ academicYearId }).pipe(
      map(({ data }) => {
        const matches = data.filter(s => {
          const sameGrade = grade ? s.grade === grade : true;
          const sameLevel = levelApi ? (s.level ?? '').toLowerCase() === levelApi : true;
          return sameGrade && sameLevel;
        });
        return matches[0]?.id ?? data[0]?.id ?? null;
      }),
      catchError(() => of<string | null>(null))
    );
  }

  private extractApiMessage(err: any): string {
    const raw = err?.error?.error?.message ?? err?.error?.message ?? err?.message;
    if (Array.isArray(raw)) return raw.join(', ');
    return typeof raw === 'string' ? raw : '';
  }

  update(field: string, value: unknown) {
    this.formData.update(fd => ({ ...fd, [field]: value } as typeof fd));
  }
}
