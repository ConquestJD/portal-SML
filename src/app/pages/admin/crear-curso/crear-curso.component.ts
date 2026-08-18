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
  CourseItem,
  ScheduleSlot,
  TeacherItem,
} from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';
import {
  PredefinedSubject,
  buildCourseCode,
  subjectCoverUrl,
} from '../../../shared/data/predefined-subjects';
import { SubjectCatalogService } from '../../../shared/data/subject-catalog.service';
import { resolveCourseCoverUrl } from '../../../shared/utils/course-cover';

@Component({
  selector: 'app-crear-curso',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...ADMIN_SHARED],
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
  existingCourses = signal<CourseItem[]>([]);
  initialAssignmentTeacherId = signal('');

  pageTitle = computed(() => this.isEditMode() ? 'Editar materia' : 'Nueva materia');

  breadcrumbItems = computed(() => [
    { label: 'Cursos', link: '/admin/cursos' },
    { label: this.isEditMode() ? 'Editar' : 'Nueva' },
  ]);

  academicYears = signal<AcademicYearItem[]>([]);
  readonly weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  readonly weekDayShort = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  readonly subjectCoverUrl = subjectCoverUrl;
  readonly levels: { key: string; label: string }[] = [
    { key: 'inicial', label: 'Inicial' },
    { key: 'primaria', label: 'Primaria' },
    { key: 'secundaria', label: 'Secundaria' },
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

  private readonly defaultStartTime = '09:00';

  scheduleDraft = signal<{ day: string; startTime: string; endTime: string }>({
    day: '',
    startTime: this.defaultStartTime,
    endTime: this.addHoursToTime(this.defaultStartTime, 2),
  });

  formData = signal({
    subjectId: '',
    name: '',
    code: '',
    level: '',
    grade: '',
    academicYearId: '',
    color: '#003366',
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

  catalogSubjects = computed(() => this.subjectCatalog.forLevel(this.formData().level));

  selectedSubject = computed((): PredefinedSubject | undefined => {
    const id = this.formData().subjectId;
    if (id) return this.subjectCatalog.findById(id);
    return this.subjectCatalog.findByName(this.formData().name);
  });

  takenSubjectNames = computed(() => {
    const grade = this.formData().grade;
    if (!grade) return new Set<string>();
    const currentId = this.courseId();
    const names = new Set<string>();
    for (const c of this.existingCourses()) {
      if (c.grade !== grade) continue;
      if (currentId && c.id === currentId) continue;
      names.add((c.name ?? '').trim().toLowerCase());
    }
    return names;
  });

  occupiedCourses = computed(() => {
    const grade = this.formData().grade;
    const currentId = this.courseId();
    if (!grade) return [] as CourseItem[];
    return this.existingCourses().filter(c => {
      if (c.grade !== grade) return false;
      if (currentId && c.id === currentId) return false;
      return (c.schedule ?? []).length > 0;
    });
  });

  occupiedBlockCount = computed(() =>
    this.occupiedCourses().reduce((n, c) => n + (c.schedule?.length ?? 0), 0)
  );

  hasSchedule = computed(() => this.formData().schedule.length > 0);

  readyCount = computed(() => {
    const d = this.formData();
    let n = 0;
    if (d.level) n++;
    if (d.grade) n++;
    if (d.subjectId || d.name) n++;
    if (d.teacherId) n++;
    return n;
  });

  formReady = computed(() => this.readyCount() === 4);

  coverPreview = computed(() => {
    const s = this.selectedSubject();
    if (s) return subjectCoverUrl(s);
    return resolveCourseCoverUrl({ name: this.formData().name });
  });

  asideInitials = computed(() => {
    const name = this.formData().name.trim();
    if (!name) return 'SML';
    const parts = name.split(/\s+/).filter(w => !/^(y|de|del|la|el|para)$/i.test(w));
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private subjectCatalog: SubjectCatalogService,
  ) {}

  ngOnInit() {
    this.subjectCatalog.load().subscribe();
    this.adminService.getTeachers({ pageSize: 100 }).subscribe({
      next: ({ data }) => this.teachers.set(data),
      error: () => this.teachers.set([])
    });

    this.loadExistingCourses();

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

  isSubjectTaken(subject: PredefinedSubject): boolean {
    return this.takenSubjectNames().has(subject.name.toLowerCase());
  }

  selectLevel(level: string) {
    this.formData.update(d => ({
      ...d,
      level,
      grade: '',
      subjectId: this.isEditMode() ? d.subjectId : '',
      name: this.isEditMode() ? d.name : '',
      code: this.isEditMode() ? d.code : '',
    }));
  }

  selectGrade(grade: string) {
    this.formData.update(d => ({ ...d, grade }));
    this.refreshCode();
    this.loadExistingCourses(grade);
  }

  selectSubject(subject: PredefinedSubject) {
    if (!this.isEditMode() && this.isSubjectTaken(subject)) return;
    this.formData.update(d => ({
      ...d,
      subjectId: subject.id,
      name: subject.name,
      color: subject.color,
    }));
    this.refreshCode();
  }

  private refreshCode() {
    if (this.isEditMode()) return;
    const d = this.formData();
    const subject = this.subjectCatalog.findById(d.subjectId);
    if (!subject || !d.grade) return;
    this.formData.update(f => ({ ...f, code: buildCourseCode(subject.codePrefix, d.grade) }));
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

        const subject = this.subjectCatalog.findByName(course.name);

        this.formData.update(fd => ({
          ...fd,
          subjectId: subject?.id ?? '',
          name: course.name,
          code: course.code,
          level: lvl || fd.level,
          grade: course.grade ?? '',
          schedule: course.schedule ?? [],
          color: course.color ?? subject?.color ?? '#003366',
          academicYearId: a?.academicYear?.id ?? fd.academicYearId,
          teacherId: a?.teacher?.id ?? '',
        }));

        if (a?.teacher?.id) this.initialAssignmentTeacherId.set(a.teacher.id);
        else this.initialAssignmentTeacherId.set('');
      },
      error: () => this.error.set('No se pudo cargar el curso')
    });
  }

  updateScheduleDraft(field: 'day' | 'startTime' | 'endTime', value: string) {
    if (field === 'startTime') {
      this.scheduleDraft.update(d => ({
        ...d,
        startTime: value,
        endTime: this.addHoursToTime(value, 2),
      }));
      return;
    }
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

    const ownOverlap = this.formData().schedule.find(s => this.slotsOverlap(d, s));
    if (ownOverlap) {
      this.scheduleError.set(`Ya hay un bloque en ${d.day} que se cruza con ese horario`);
      return;
    }

    const busy = this.findOccupiedOverlap(d.day, d.startTime, d.endTime);
    if (busy) {
      this.scheduleError.set(
        `Ese horario se cruza con ${busy.course.name} (${busy.block.startTime} – ${busy.block.endTime})`
      );
      return;
    }

    const newBlock: ScheduleSlot = { day: d.day, startTime: d.startTime, endTime: d.endTime };
    this.formData.update(f => ({ ...f, schedule: [...f.schedule, newBlock] }));
    this.scheduleDraft.set({
      day: '',
      startTime: this.defaultStartTime,
      endTime: this.addHoursToTime(this.defaultStartTime, 2),
    });
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

  private addHoursToTime(time: string, hours: number): string {
    const [h, m] = (time || this.defaultStartTime).split(':').map(Number);
    const wrapped = (((h || 0) + hours) * 60 + (m || 0) + 24 * 60) % (24 * 60);
    const hh = Math.floor(wrapped / 60);
    const mm = wrapped % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  private loadExistingCourses(grade?: string) {
    this.adminService.getCourses({
      ...(grade ? { grade } : {}),
      pageSize: 200,
    }).subscribe({
      next: ({ data }) => {
        if (!grade) {
          this.existingCourses.set(data);
          return;
        }
        const byId = new Map(this.existingCourses().map(c => [c.id, c]));
        for (const course of data) byId.set(course.id, course);
        this.existingCourses.set([...byId.values()]);
      },
      error: () => {
        if (!grade) this.existingCourses.set([]);
      }
    });
  }

  private findOccupiedOverlap(
    day: string,
    startTime: string,
    endTime: string
  ): { course: CourseItem; block: ScheduleSlot } | null {
    const probe = { day, startTime, endTime };
    for (const course of this.occupiedCourses()) {
      for (const block of course.schedule ?? []) {
        if (this.slotsOverlap(probe, block)) return { course, block };
      }
    }
    return null;
  }

  private slotsOverlap(
    a: { day: string; startTime: string; endTime: string },
    b: ScheduleSlot
  ): boolean {
    if (!this.sameDay(a.day, b.day)) return false;
    return !(a.endTime <= b.startTime || a.startTime >= b.endTime);
  }

  private sameDay(a: string, b: string): boolean {
    return this.normalizeDay(a) === this.normalizeDay(b);
  }

  private normalizeDay(day: string): string {
    return (day || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  getBlockTop(startTime: string): number {
    return Math.max(0, this.timeToMinutes(startTime) - this.calendarStartHour * 60);
  }

  getBlockHeight(startTime: string, endTime: string): number {
    return Math.max(20, this.timeToMinutes(endTime) - this.timeToMinutes(startTime));
  }

  getBlocksForDay(day: string): ScheduleSlot[] {
    return this.formData().schedule
      .filter(s => this.sameDay(s.day, day))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  getOccupiedBlocksForDay(day: string): { course: CourseItem; block: ScheduleSlot }[] {
    const result: { course: CourseItem; block: ScheduleSlot }[] = [];
    for (const course of this.occupiedCourses()) {
      for (const block of course.schedule ?? []) {
        if (this.sameDay(block.day, day)) result.push({ course, block });
      }
    }
    return result.sort((a, b) => a.block.startTime.localeCompare(b.block.startTime));
  }

  courseAccent(course: CourseItem): string {
    return course.color || '#5c6b7e';
  }

  onSubmit() {
    this.isLoading.set(true);
    this.error.set('');
    this.success.set('');
    const d = this.formData();

    if (!d.level || !d.grade) {
      this.error.set('Elige nivel y grado');
      this.isLoading.set(false);
      return;
    }

    if (!d.name || !d.code) {
      this.error.set('Elige una materia del catálogo');
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

    const clash = d.schedule
      .map(slot => this.findOccupiedOverlap(slot.day, slot.startTime, slot.endTime))
      .find((hit): hit is { course: CourseItem; block: ScheduleSlot } => hit != null);
    if (clash) {
      this.error.set(
        `El horario se cruza con ${clash.course.name} (${clash.block.day} ${clash.block.startTime} – ${clash.block.endTime}). Elige otra hora.`
      );
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
