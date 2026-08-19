import { Component, signal, computed, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { concat, forkJoin } from 'rxjs';
import { last } from 'rxjs/operators';
import {
  TeacherService,
  TeacherCourse,
  TeacherTask,
  GradeEntry,
  Material,
  TeacherCourseAnnouncement,
  AcademicPeriod,
  AttendanceHistoryBucket,
  TeacherExam,
  filterTeacherRosterByCourseGrade,
} from '../../../services/teacher.service';
import { AnnouncementService } from '../../../services/announcement.service';
import { courseCoverAlt, resolveCourseCoverUrl } from '../../../shared/utils/course-cover';

type TabType = 'estudiantes' | 'tareas' | 'notas' | 'examenes' | 'asistencia' | 'material' | 'comunicados';
type TaskFilter = 'all' | 'pending';

interface CourseStudent {
  id: string;
  code: string;
  name: string;
  email: string;
  average: string | number;
  status: string;
}

interface TaskRow extends TeacherTask {
  submitted: number;
  pendingToGrade: number;
  totalStudents: number;
}

interface AttendanceSession {
  date: string;
  present: number;
  late: number;
  absent: number;
  justified: number;
  total: number;
}

interface MaterialUnitGroup {
  id: string;
  title: string;
  folders: Material[];
}

@Component({
  selector: 'app-curso-detalle-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './curso-detalle-profesor.component.html',
  styleUrl: './curso-detalle-profesor.component.css'
})
export class CursoDetalleProfesorComponent implements OnInit {
  courseId = signal('');
  activeTab = signal<TabType>('estudiantes');
  searchQuery = signal('');
  taskFilter = signal<TaskFilter>('all');
  loading = signal(true);
  error = signal('');

  course = signal<TeacherCourse | null>(null);
  students = signal<CourseStudent[]>([]);
  studentsLoading = signal(false);
  tasks = signal<TeacherTask[]>([]);
  grades = signal<GradeEntry[]>([]);
  periods = signal<AcademicPeriod[]>([]);
  gradesLoading = signal(false);
  gradesError = signal('');
  gradesSuccess = signal('');
  gradeQuery = signal('');
  draftScores = signal<Record<string, string>>({});
  exams = signal<TeacherExam[]>([]);
  examsLoading = signal(false);
  examsError = signal('');
  attendance = signal<AttendanceHistoryBucket[]>([]);
  attendanceLoading = signal(false);
  materials = signal<Material[]>([]);
  announcements = signal<TeacherCourseAnnouncement[]>([]);
  announcementsLoading = signal(false);
  announcementsError = signal('');

  materialExpanded = signal<Record<string, boolean>>({});

  gradeSaving = signal(false);

  readonly weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  readonly weekDayShort = ['L', 'M', 'X', 'J', 'V', 'S'];

  private readonly destroyRef = inject(DestroyRef);

  filteredStudents = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.students();
    if (!q) return list;
    return list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  taskRows = computed((): TaskRow[] => {
    const total = this.students().length;
    return this.tasks().map(t => {
      const submitted = t.submissionsCount ?? t.submitted ?? 0;
      const graded = t.gradedCount ?? 0;
      const pendingToGrade =
        typeof t.pending === 'number' && t.submissionsCount === undefined && t.gradedCount === undefined
          ? t.pending
          : Math.max(0, submitted - graded);
      return { ...t, submitted, pendingToGrade, totalStudents: total };
    });
  });

  filteredTasks = computed(() => {
    const rows = this.taskRows();
    if (this.taskFilter() === 'pending') return rows.filter(t => t.pendingToGrade > 0);
    return rows;
  });

  pendingToGradeTotal = computed(() => {
    if (this.tasks().length) {
      return this.taskRows().reduce((sum, t) => sum + t.pendingToGrade, 0);
    }
    return this.course()?.pendingGrading ?? 0;
  });

  scheduleCount = computed(() => this.course()?.course?.schedule?.length ?? 0);

  attendanceSessions = computed((): AttendanceSession[] => {
    const byDate = new Map<string, AttendanceSession>();
    for (const row of this.attendance()) {
      const date = this.toDateKey(row.date);
      const session = byDate.get(date) ?? {
        date, present: 0, late: 0, absent: 0, justified: 0, total: 0,
      };
      const n = this.historyCount(row);
      const status = (row.status || '').toUpperCase();
      if (status === 'PRESENT') session.present += n;
      else if (status === 'LATE') session.late += n;
      else if (status === 'JUSTIFIED') session.justified += n;
      else session.absent += n;
      session.total += n;
      byDate.set(date, session);
    }
    return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
  });

  materialGroups = computed((): MaterialUnitGroup[] => {
    const groups = new Map<string, MaterialUnitGroup>();
    for (const folder of this.materials()) {
      const id = folder.unit?.id ?? '_none';
      const title = (folder.unit?.name ?? folder.unit?.title ?? '').trim() || 'Sin unidad';
      const group = groups.get(id) ?? { id, title, folders: [] };
      group.folders.push(folder);
      groups.set(id, group);
    }
    return Array.from(groups.values()).sort((a, b) => {
      if (a.id === '_none') return 1;
      if (b.id === '_none') return -1;
      return a.title.localeCompare(b.title, 'es');
    });
  });

  gradebookRows = computed(() => {
    this.draftScores();
    const q = this.gradeQuery().toLowerCase().trim();
    let list = [...this.students()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (q) {
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
      );
    }
    return list.map(student => {
      const scores = this.periods()
        .map(period => this.liveScore(student.id, period.id))
        .filter((n): n is number => n != null);
      const avg = scores.length
        ? Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 10) / 10
        : null;
      return { student, average: avg };
    });
  });

  currentPeriod = computed(() =>
    this.periods().find(p => this.isCurrentPeriod(p)) ?? null,
  );

  gradebookDirty = computed(() => {
    const drafts = this.draftScores();
    return Object.entries(drafts).some(([key, raw]) => {
      const [studentId, periodId] = key.split(':');
      if (!studentId || !periodId) return false;
      const parsed = this.parseScore(raw);
      if (raw.trim() === '') return false;
      return parsed !== this.cellScore(studentId, periodId);
    });
  });

  classAverage = computed(() => {
    this.draftScores();
    const scores = this.students().map(student => {
      const nums = this.periods()
        .map(period => this.liveScore(student.id, period.id))
        .filter((n): n is number => n != null);
      if (!nums.length) return null;
      return nums.reduce((s, n) => s + n, 0) / nums.length;
    }).filter((n): n is number => n != null);
    if (!scores.length) return null;
    return Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 10) / 10;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teacherService: TeacherService,
    private announcementService: AnnouncementService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.courseId.set(id);
    if (!id || id === 'undefined') {
      this.error.set('No se identificó el curso. Vuelve a Mis cursos y ábrelo de nuevo.');
      this.loading.set(false);
      return;
    }

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const tab = this.tabFromQuery(params.get('tab'));
      const want: TabType = tab ?? 'estudiantes';
      if (want !== this.activeTab()) {
        this.activeTab.set(want);
        this.loadTabData(want);
      }
    });

    this.loadCourse();
  }

  private tabFromQuery(raw: string | null): TabType | null {
    if (!raw) return null;
    const allowed: TabType[] = ['estudiantes', 'tareas', 'notas', 'examenes', 'asistencia', 'material', 'comunicados'];
    return allowed.includes(raw as TabType) ? (raw as TabType) : null;
  }

  private apiTeacherAssignmentId(): string {
    const fromCourse = this.course()?.id ?? this.courseId();
    if (!fromCourse || fromCourse === 'undefined') return '';
    return fromCourse;
  }

  loadCourse() {
    this.teacherService.getCourse(this.courseId()).subscribe({
      next: (data) => {
        this.course.set(data);
        this.loading.set(false);
        this.loadStudents();
        this.loadTasks();
        const tab = this.activeTab();
        if (tab !== 'estudiantes' && tab !== 'tareas') this.loadTabData(tab);
      },
      error: () => { this.error.set('No se pudo cargar el curso.'); this.loading.set(false); }
    });
  }

  loadStudents() {
    const c = this.course();
    const grade = (c?.course?.grade ?? '').trim();
    const level = (c?.course?.level ?? '').trim();
    const aid = this.apiTeacherAssignmentId();
    this.studentsLoading.set(true);

    this.teacherService
      .getStudentsInCourse(aid, {
        ...(grade ? { grade } : {}),
        ...(level ? { level } : {}),
      })
      .subscribe({
        next: (data) => {
          const rows = filterTeacherRosterByCourseGrade(data as any[], grade, level);
          this.students.set(this.normalizeStudents(rows as any[]));
          this.studentsLoading.set(false);
        },
        error: () => {
          this.students.set([]);
          this.studentsLoading.set(false);
        },
      });
  }

  private normalizeStudents(raw: any[]): CourseStudent[] {
    return (raw ?? []).map(r => {
      const s = r?.student ?? r;
      const u = s?.user ?? r?.user ?? {};
      const first = u.firstName ?? s?.firstName ?? '';
      const last = u.lastName ?? s?.lastName ?? '';
      const fullName = `${first} ${last}`.trim() || s?.name || '(sin nombre)';
      return {
        id: s?.id ?? r?.studentId ?? r?.id ?? '',
        code: s?.studentCode ?? s?.code ?? '',
        name: fullName,
        email: u.email ?? s?.email ?? '',
        average: s?.averageGrade ?? r?.averageGrade ?? '—',
        status: s?.status ?? u?.status ?? 'ACTIVE',
      };
    });
  }

  private loadTabData(tab: TabType) {
    switch (tab) {
      case 'tareas':
        this.loadTasks();
        break;
      case 'notas':
        this.loadGradebook();
        break;
      case 'examenes':
        this.loadExams();
        break;
      case 'asistencia':
        this.loadAttendance();
        break;
      case 'material':
        this.loadMaterials();
        break;
      case 'comunicados':
        this.loadAnnouncements();
        break;
      default:
        break;
    }
  }

  loadTasks() {
    this.teacherService.getTasks(this.apiTeacherAssignmentId()).subscribe({
      next: (data) => this.tasks.set(data ?? []),
      error: () => this.tasks.set([]),
    });
  }

  loadGradebook() {
    const aid = this.apiTeacherAssignmentId();
    if (!aid) return;
    this.gradesLoading.set(true);
    this.gradesError.set('');
    forkJoin({
      grades: this.teacherService.getGrades(aid),
      periods: this.teacherService.getCoursePeriods(aid),
    }).subscribe({
      next: ({ grades, periods }) => {
        this.grades.set(grades ?? []);
        this.periods.set(periods ?? []);
        this.draftScores.set({});
        this.gradesLoading.set(false);
      },
      error: () => {
        this.grades.set([]);
        this.periods.set([]);
        this.gradesError.set('No se pudo cargar el libro de notas.');
        this.gradesLoading.set(false);
      },
    });
  }

  loadAttendance() {
    this.attendanceLoading.set(true);
    this.teacherService.getAttendanceHistory(this.apiTeacherAssignmentId()).subscribe({
      next: (data) => {
        this.attendance.set(data ?? []);
        this.attendanceLoading.set(false);
      },
      error: () => {
        this.attendance.set([]);
        this.attendanceLoading.set(false);
      },
    });
  }

  loadMaterials() {
    this.teacherService.getMaterials(this.apiTeacherAssignmentId()).subscribe({
      next: (data) => {
        const list = data ?? [];
        this.materials.set(list);
        if (list.length && !Object.keys(this.materialExpanded()).length) {
          this.materialExpanded.set({ [list[0].id]: true });
        }
      },
    });
  }

  loadAnnouncements() {
    const aid = this.apiTeacherAssignmentId();
    if (!aid) return;
    this.announcementsLoading.set(true);
    this.announcementsError.set('');
    this.teacherService.getCourseAnnouncements(aid).subscribe({
      next: (data) => {
        this.announcements.set(data ?? []);
        this.announcementsLoading.set(false);
      },
      error: () => {
        this.announcements.set([]);
        this.announcementsError.set('No se pudieron cargar los comunicados.');
        this.announcementsLoading.set(false);
      },
    });
  }

  deleteMaterial(materialId: string) {
    if (!confirm('¿Eliminar esta carpeta de material?')) return;
    this.teacherService.deleteMaterial(this.apiTeacherAssignmentId(), materialId).subscribe({
      next: () => this.loadMaterials()
    });
  }

  toggleMaterialFolder(materialId: string) {
    this.materialExpanded.update((rec) => ({
      ...rec,
      [materialId]: !rec[materialId],
    }));
  }

  isMaterialFolderOpen(materialId: string): boolean {
    return !!this.materialExpanded()[materialId];
  }

  materialFileLabel(f: { name?: string; filename?: string }): string {
    return (f.filename ?? f.name ?? '').trim() || 'Archivo';
  }

  formatMaterialFileSize(bytes: number | undefined): string {
    if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  mimeTypeLabel(mime?: string): string {
    if (!mime) return 'Archivo';
    if (mime.includes('pdf')) return 'PDF';
    if (mime.includes('image')) return 'Imagen';
    if (mime.includes('word') || mime.includes('document')) return 'Documento';
    if (mime.includes('sheet') || mime.includes('excel')) return 'Hoja';
    if (mime.includes('video')) return 'Video';
    if (mime.includes('audio')) return 'Audio';
    if (mime.includes('zip') || mime.includes('compressed')) return 'Comprimido';
    return mime.split('/')[1]?.toUpperCase() || 'Archivo';
  }

  coverUrl(): string {
    return resolveCourseCoverUrl({ name: this.getCourseName() });
  }

  coverAlt(): string {
    return courseCoverAlt(this.getCourseName());
  }

  getCourseName(): string { return this.course()?.course?.name ?? ''; }

  courseCode(): string {
    return (this.course()?.code ?? this.course()?.course?.code ?? '').trim();
  }

  getGradeLabel(): string {
    const c = this.course();
    if (!c) return '';
    const grade = (c.course?.grade ?? '').trim();
    const level = this.levelLabel((c.course?.level ?? '').trim());
    return [grade, level].filter(Boolean).join(' · ');
  }

  yearName(): string {
    return (this.course()?.academicYear?.name ?? '').trim();
  }

  heroMeta(): string {
    return [this.getGradeLabel(), this.yearName()].filter(Boolean).join(' · ') || 'Santa María Laura';
  }

  dayHasClass(day: string): boolean {
    return (this.course()?.course?.schedule ?? []).some(s => s.day === day);
  }

  studentInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '·';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  exportRosterCsv() {
    const rows = this.filteredStudents();
    if (!rows.length) return;
    const escape = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      ['Código', 'Nombre', 'Correo', 'Promedio'].join(','),
      ...rows.map(s => [escape(s.code), escape(s.name), escape(s.email), escape(s.average)].join(',')),
    ];
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.getCourseName() || 'curso'}-alumnos.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  isClosedTask(t: TeacherTask): boolean {
    const s = (t.status || '').toUpperCase();
    if (s === 'CLOSED' || s === 'ARCHIVED' || s === 'ENDED') return true;
    if (!t.dueDate) return false;
    const end = new Date(t.dueDate).getTime();
    return Number.isFinite(end) && end < Date.now();
  }

  taskStatusLabel(t: TeacherTask): string {
    if (this.isClosedTask(t)) {
      const s = (t.status || '').toUpperCase();
      if (s === 'CLOSED' || s === 'ARCHIVED' || s === 'ENDED') return 'Cerrada';
      return 'Vencida';
    }
    return 'Publicada';
  }

  formatDueDate(d?: string): string {
    if (!d) return 'Sin fecha';
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return d;
    return x.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
  }

  findGrade(grades: GradeEntry[], studentId: string, periodId: string): GradeEntry | undefined {
    return grades.find(g => g.student?.id === studentId && g.period?.id === periodId);
  }

  cellScore(studentId: string, periodId: string): number | null {
    const g = this.findGrade(this.grades(), studentId, periodId);
    return g && Number.isFinite(g.score) ? g.score : null;
  }

  cellKey(studentId: string, periodId: string): string {
    return `${studentId}:${periodId}`;
  }

  cellInput(studentId: string, periodId: string): string {
    const key = this.cellKey(studentId, periodId);
    const drafts = this.draftScores();
    if (Object.prototype.hasOwnProperty.call(drafts, key)) return drafts[key];
    const n = this.cellScore(studentId, periodId);
    return n == null ? '' : String(n);
  }

  setCellScore(studentId: string, periodId: string, value: string | number) {
    this.draftScores.update(d => ({ ...d, [this.cellKey(studentId, periodId)]: String(value ?? '') }));
    this.gradesSuccess.set('');
  }

  liveScore(studentId: string, periodId: string): number | null {
    const key = this.cellKey(studentId, periodId);
    const drafts = this.draftScores();
    if (Object.prototype.hasOwnProperty.call(drafts, key)) {
      const raw = drafts[key].trim();
      return raw ? this.parseScore(raw) : null;
    }
    return this.cellScore(studentId, periodId);
  }

  isInvalidCell(studentId: string, periodId: string): boolean {
    const key = this.cellKey(studentId, periodId);
    const raw = this.draftScores()[key];
    if (raw == null || !String(raw).trim()) return false;
    return this.parseScore(raw) == null;
  }

  periodFilled(periodId: string): number {
    return this.students().filter(s => this.liveScore(s.id, periodId) != null).length;
  }

  isCurrentPeriod(period: AcademicPeriod): boolean {
    const now = Date.now();
    const start = period.startDate ? new Date(period.startDate).getTime() : NaN;
    const end = period.endDate ? new Date(period.endDate).getTime() : NaN;
    return Number.isFinite(start) && Number.isFinite(end) && now >= start && now <= end;
  }

  shortPeriodName(period: AcademicPeriod): string {
    return period.name.replace(/\s*bimestre\s*/i, '').trim() || period.name;
  }

  onScoreKeydown(event: KeyboardEvent, studentId: string, periodId: string) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const rows = this.gradebookRows();
    const idx = rows.findIndex(r => r.student.id === studentId);
    const next = rows[idx + 1];
    if (!next) {
      this.saveGradebook();
      return;
    }
    const el = document.querySelector<HTMLInputElement>(
      `input[data-grade-cell="${this.cellKey(next.student.id, periodId)}"]`,
    );
    el?.focus();
    el?.select();
  }

  saveGradebook() {
    const aid = this.apiTeacherAssignmentId();
    if (!aid || this.gradeSaving()) return;

    const byPeriod = new Map<string, { studentId: string; score: number }[]>();
    for (const student of this.students()) {
      for (const period of this.periods()) {
        const raw = this.cellInput(student.id, period.id).trim();
        if (!raw) continue;
        const score = this.parseScore(raw);
        if (score == null) {
          this.gradesError.set('Hay notas fuera de rango. Usa valores de 0 a 20.');
          return;
        }
        if (score === this.cellScore(student.id, period.id)) continue;
        const list = byPeriod.get(period.id) ?? [];
        list.push({ studentId: student.id, score });
        byPeriod.set(period.id, list);
      }
    }

    if (!byPeriod.size) {
      this.gradesError.set('No hay cambios para guardar.');
      return;
    }

    const jobs = [...byPeriod.entries()].map(([periodId, records]) =>
      this.teacherService.saveGradesBulk(aid, { periodId, records }),
    );

    this.gradeSaving.set(true);
    this.gradesError.set('');
    this.gradesSuccess.set('');
    concat(...jobs).pipe(last()).subscribe({
      next: (grades) => {
        this.grades.set(grades ?? []);
        this.draftScores.set({});
        this.gradeSaving.set(false);
        this.gradesSuccess.set('Notas guardadas.');
      },
      error: (err) => {
        this.gradeSaving.set(false);
        this.gradesError.set(this.extractHttpError(err, 'No se pudieron guardar las notas.'));
      },
    });
  }

  exportGradebookCsv() {
    const rows = this.gradebookRows();
    const periods = this.periods();
    if (!rows.length || !periods.length) return;
    const escape = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Código', 'Alumno', ...periods.map(p => p.name), 'Promedio'];
    const lines = [
      header.map(escape).join(','),
      ...rows.map(row => {
        const scores = periods.map(p => {
          const n = this.cellScore(row.student.id, p.id);
          return n == null ? '' : String(n);
        });
        return [
          escape(row.student.code),
          escape(row.student.name),
          ...scores.map(escape),
          escape(row.average ?? ''),
        ].join(',');
      }),
    ];
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.getCourseName() || 'curso'}-notas.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  loadExams() {
    const aid = this.apiTeacherAssignmentId();
    if (!aid) return;
    this.examsLoading.set(true);
    this.examsError.set('');
    this.teacherService.getExams(aid).subscribe({
      next: (data) => {
        this.exams.set(data ?? []);
        this.examsLoading.set(false);
      },
      error: () => {
        this.exams.set([]);
        this.examsError.set('No se pudieron cargar los exámenes.');
        this.examsLoading.set(false);
      },
    });
  }

  formatExamDate(iso?: string | null): string {
    if (!iso) return 'Sin fecha';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
  }

  deleteExam(exam: TeacherExam) {
    if (!confirm(`¿Eliminar el examen «${exam.title}»? Se perderán las notas registradas.`)) return;
    this.examsError.set('');
    this.teacherService.deleteExam(this.apiTeacherAssignmentId(), exam.id).subscribe({
      next: () => this.loadExams(),
      error: (err) => this.examsError.set(this.extractHttpError(err, 'No se pudo eliminar el examen.')),
    });
  }

  private parseScore(raw: string): number | null {
    const n = Number(String(raw).trim().replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || n > 20) return null;
    return Math.round(n * 10) / 10;
  }

  private extractHttpError(err: unknown, fallback: string): string {
    const e = err as { error?: { message?: string | string[]; error?: { message?: string } }; message?: string };
    const nested = e?.error?.error?.message;
    const raw =
      (typeof nested === 'string' && nested.trim() ? nested : '') ||
      (Array.isArray(e?.error?.message) ? e.error!.message!.filter(Boolean).join('. ') : '') ||
      (typeof e?.error?.message === 'string' ? e.error.message : '') ||
      (typeof e?.message === 'string' ? e.message : '');
    return raw.trim() || fallback;
  }

  formatSessionDate(date: string): string {
    const d = new Date(`${date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return date;
    return d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  setTab(tab: TabType) {
    this.activeTab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'estudiantes' ? null : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.loadTabData(tab);
  }

  announcementPriorityLabel(priority: string): string {
    const u = (priority ?? '').toUpperCase();
    if (u === 'HIGH') return 'Urgente';
    if (u === 'LOW') return 'Normal';
    return 'Importante';
  }

  formatAnnouncementDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
  }

  deleteAnnouncement(a: TeacherCourseAnnouncement) {
    if (!confirm('¿Eliminar este comunicado? Los estudiantes y apoderados dejarán de verlo.')) {
      return;
    }
    this.announcementsError.set('');
    this.announcementService.delete(a.id).subscribe({
      next: () => this.loadAnnouncements(),
      error: () => this.announcementsError.set('No se pudo eliminar el comunicado.'),
    });
  }

  openAnnouncementAttachment(announcementId: string, fileId: string) {
    if (!fileId) return;
    const url = this.announcementService.getDownloadUrl(announcementId, fileId);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private levelLabel(level: string): string {
    const map: Record<string, string> = {
      inicial: 'Inicial', primaria: 'Primaria', secundaria: 'Secundaria',
      Inicial: 'Inicial', Primaria: 'Primaria', Secundaria: 'Secundaria',
    };
    return map[level] || level;
  }

  private historyCount(row: AttendanceHistoryBucket): number {
    if (typeof row._count === 'number') return row._count;
    return row._count?.status ?? 0;
  }

  private toDateKey(value: string): string {
    if (!value) return '';
    return String(value).slice(0, 10);
  }
}
