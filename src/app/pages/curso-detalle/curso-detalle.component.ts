import { Component, signal, computed, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  StudentService,
  StudentCourse,
  StudentTask,
  StudentGrade,
  StudentAttendance,
  StudentMaterial,
  StudentPeriod,
} from '../../services/student.service';
import { AnnouncementService, Announcement } from '../../services/announcement.service';
import { isMaterialFolder, materialFolderTitle } from '../../services/teacher.service';
import { courseCoverAlt, resolveCourseCoverUrl } from '../../shared/utils/course-cover';

type TabType = 'material' | 'tareas' | 'notas' | 'asistencia' | 'comunicados';
type TaskFilter = 'all' | 'pending';

interface MaterialBinFile {
  id: string;
  materialId: string;
  name: string;
  size?: number;
  mimeType?: string;
}

interface MaterialBinFolder {
  id: string;
  title: string;
  files: MaterialBinFile[];
}

interface MaterialBin {
  id: string;
  title: string;
  roman: string;
  kind: 'period' | 'loose' | 'placeholder';
  files: MaterialBinFile[];
  folders: MaterialBinFolder[];
}

export type CourseGradeRow = {
  id: string;
  kind: 'period' | 'task';
  taskId?: string;
  label: string;
  dateLabel: string;
  maxPoints: string;
  scoreDisplay: string;
  pctDisplay: string;
};

@Component({
  selector: 'app-curso-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './curso-detalle.component.html',
  styleUrl: './curso-detalle.component.css'
})
export class CursoDetalleComponent implements OnInit {
  courseId = signal('');
  activeTab = signal<TabType>('material');
  taskFilter = signal<TaskFilter>('all');
  loading = signal(true);
  error = signal('');

  course = signal<StudentCourse | null>(null);
  materials = signal<StudentMaterial[]>([]);
  periods = signal<StudentPeriod[]>([]);
  materialsLoading = signal(false);
  materialExpanded = signal<Record<string, boolean>>({});
  tasks = signal<StudentTask[]>([]);
  grades = signal<StudentGrade[]>([]);
  attendance = signal<StudentAttendance[]>([]);
  attendanceSummary = signal<Record<string, number>>({});
  attendanceLoading = signal(false);
  announcements = signal<Announcement[]>([]);
  announcementsLoading = signal(false);
  announcementsError = signal('');
  materialDownloadError = signal('');

  readonly weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  readonly weekDayShort = ['L', 'M', 'X', 'J', 'V', 'S'];

  coverUrl = computed(() => {
    const c = this.course();
    return resolveCourseCoverUrl({
      name: c?.name ?? c?.course?.name,
      imageUrl: c?.course?.imageUrl,
    });
  });

  coverAlt = computed(() => courseCoverAlt(this.course()?.name ?? this.course()?.course?.name));

  pendingTasksCount = computed(() =>
    this.tasks().filter((t) => !this.taskIsDone(t)).length
  );

  materialGroups = computed((): MaterialBin[] => {
    const materials = this.materials();
    const toFiles = (list: StudentMaterial[]): MaterialBinFile[] =>
      list.flatMap(m =>
        (m.files ?? []).map(f => ({
          id: f.id,
          materialId: m.id,
          name: (f.filename ?? f.name ?? '').trim() || 'Archivo',
          size: f.size,
          mimeType: f.mimeType,
        })),
      );
    const toFolders = (list: StudentMaterial[]): MaterialBinFolder[] =>
      list
        .filter(isMaterialFolder)
        .map(m => ({
          id: m.id,
          title: materialFolderTitle(m),
          files: toFiles([m]),
        }));
    const split = (list: StudentMaterial[]) => ({
      folders: toFolders(list),
      files: toFiles(list.filter(m => !isMaterialFolder(m))),
    });
    const inPeriod = (periodId: string) =>
      materials.filter(m => (m.periodId ?? m.period?.id) === periodId);

    const roman = ['I', 'II', 'III', 'IV'];
    const fallbackTitles = ['I Bimestre', 'II Bimestre', 'III Bimestre', 'IV Bimestre'];
    const periods = this.periods().slice(0, 4);
    const bins: MaterialBin[] = fallbackTitles.map((title, i) => {
      const period = periods[i];
      if (!period) {
        return {
          id: `_ph-${i}`,
          title,
          roman: roman[i],
          kind: 'placeholder' as const,
          files: [] as MaterialBinFile[],
          folders: [] as MaterialBinFolder[],
        };
      }
      return {
        id: period.id,
        title: period.name || title,
        roman: roman[i],
        kind: 'period' as const,
        ...split(inPeriod(period.id)),
      };
    });
    bins.push({
      id: '_loose',
      title: 'Fuera de bimestres',
      roman: '·',
      kind: 'loose',
      ...split(materials.filter(m => !(m.periodId ?? m.period?.id))),
    });
    return bins;
  });

  bimestreBins = computed(() => this.materialGroups().filter(b => b.kind !== 'loose'));
  looseBin = computed(() => this.materialGroups().find(b => b.kind === 'loose') ?? null);

  filteredTasks = computed(() => {
    const list = this.tasks();
    if (this.taskFilter() === 'pending') return list.filter(t => !this.taskIsDone(t));
    return list;
  });

  scheduleCount = computed(() => this.course()?.course?.schedule?.length ?? 0);

  attendancePercent = computed(() => {
    const s = this.attendanceSummary();
    const present = s['PRESENT'] ?? 0;
    const late = s['LATE'] ?? 0;
    const justified = s['JUSTIFIED'] ?? 0;
    const absent = s['ABSENT'] ?? 0;
    const total = present + late + justified + absent;
    if (!total) return '—';
    return `${Math.round(((present + late + justified) / total) * 100)}`;
  });

  gradePeriods = computed(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const g of this.grades()) {
      const id = g.period?.id;
      const name = (g.period?.name ?? '').trim();
      if (!id) continue;
      if (!map.has(id)) map.set(id, { id, name: name || 'Bimestre' });
    }
    return [...map.values()];
  });

  courseGradeRows = computed((): CourseGradeRow[] => {
    const withTs: { row: CourseGradeRow; ts: number }[] = [];

    for (const g of this.grades()) {
      const ts = g.createdAt ? new Date(g.createdAt).getTime() : 0;
      withTs.push({
        ts: Number.isFinite(ts) ? ts : 0,
        row: {
          id: `grade-${g.id}`,
          kind: 'period',
          label: g.period?.name?.trim() ? g.period.name : 'Calificación del período',
          dateLabel: this.formatGradeDate(g),
          maxPoints: '20',
          scoreDisplay: g.score != null ? String(g.score) : '—',
          pctDisplay: '—',
        },
      });
    }

    for (const t of this.tasks()) {
      const sub = t.submission;
      if (!sub) continue;
      const st = (sub.status || '').toUpperCase();
      const hasScore = sub.score != null && Number.isFinite(Number(sub.score));
      if (st !== 'GRADED' && !hasScore) continue;

      const max = t.maxScore ?? 20;
      const scNum = hasScore ? Number(sub.score) : NaN;
      const pct =
        hasScore && max > 0 && Number.isFinite(scNum)
          ? `${Math.round((scNum / max) * 1000) / 10}%`
          : '—';

      const dateRaw = sub.gradedAt ?? sub.submittedAt ?? t.dueDate;
      const d = dateRaw ? new Date(dateRaw) : null;
      const dateLabel =
        d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('es-PE') : '—';
      const ts = d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;

      withTs.push({
        ts,
        row: {
          id: `task-${t.id}`,
          kind: 'task',
          taskId: t.id,
          label: t.title,
          dateLabel,
          maxPoints: String(max),
          scoreDisplay: hasScore ? String(sub.score) : '—',
          pctDisplay: pct,
        },
      });
    }

    withTs.sort((a, b) => b.ts - a.ts);
    return withTs.map((x) => x.row);
  });

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private studentService: StudentService,
    private announcementService: AnnouncementService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.courseId.set(id);

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const tab = this.tabFromQuery(params.get('tab')) ?? 'material';
      if (tab !== this.activeTab()) this.applyTab(tab);
    });

    this.loadCourse();
    this.loadMaterials();
    this.loadTasks();
  }

  private tabFromQuery(raw: string | null): TabType | null {
    if (!raw) return null;
    if (raw === 'contenido') return 'material';
    if (raw === 'calificaciones') return 'notas';
    const allowed: TabType[] = ['material', 'tareas', 'notas', 'asistencia', 'comunicados'];
    return allowed.includes(raw as TabType) ? (raw as TabType) : null;
  }

  private applyTab(tab: TabType) {
    this.activeTab.set(tab);
    if (tab === 'tareas') this.loadTasks();
    if (tab === 'notas') {
      this.loadGrades();
      this.loadTasks();
    }
    if (tab === 'material') this.loadMaterials();
    if (tab === 'asistencia') this.loadAttendance();
    if (tab === 'comunicados') this.loadAnnouncements();
  }

  loadCourse() {
    this.studentService.getCourse(this.courseId()).subscribe({
      next: (data) => { this.course.set(data); this.loading.set(false); },
      error: () => { this.error.set('No se pudo cargar el curso.'); this.loading.set(false); }
    });
  }

  loadMaterials() {
    this.materialsLoading.set(true);
    this.studentService.getCourseMaterials(this.courseId()).subscribe({
      next: (data) => {
        this.periods.set(data.periods ?? []);
        this.materials.set(data.materials ?? []);
        this.materialsLoading.set(false);
      },
      error: () => {
        this.periods.set([]);
        this.materials.set([]);
        this.materialsLoading.set(false);
      },
    });
  }

  loadTasks() {
    this.studentService.getCourseTasks(this.courseId()).subscribe({
      next: (data) => this.tasks.set(data)
    });
  }

  loadGrades() {
    this.studentService.getCourseGrades(this.courseId()).subscribe({
      next: (data) => this.grades.set(data)
    });
  }

  loadAttendance() {
    this.attendanceLoading.set(true);
    this.studentService.getAttendance({ courseId: this.courseId() }).subscribe({
      next: (data) => {
        this.attendance.set(data.records ?? []);
        this.attendanceSummary.set(data.summary ?? {});
        this.attendanceLoading.set(false);
      },
      error: () => {
        this.attendance.set([]);
        this.attendanceSummary.set({});
        this.attendanceLoading.set(false);
      },
    });
  }

  loadAnnouncements() {
    this.announcementsLoading.set(true);
    this.announcementsError.set('');
    this.announcementService.getAnnouncements({ pageSize: 40 }).subscribe({
      next: ({ data }) => {
        const id = this.courseId();
        this.announcements.set(
          (data ?? []).filter(a => a.courseId === id || a.teacherAssignmentId === id),
        );
        this.announcementsLoading.set(false);
      },
      error: () => {
        this.announcementsError.set('No se pudieron cargar los comunicados.');
        this.announcementsLoading.set(false);
      },
    });
  }

  downloadMaterial(material: { id?: string; name?: string }) {
    const mid = material?.id;
    if (!mid) return;
    this.materialDownloadError.set('');
    const fallback =
      (material.name && String(material.name).trim()) ||
      'material';

    this.studentService.downloadCourseMaterialBlob(this.courseId(), mid).subscribe({
      next: async (res) => {
        const errMsg = await this.messageIfBlobIsApiError(res.blob);
        if (errMsg) {
          this.materialDownloadError.set(errMsg);
          return;
        }
        this.triggerBlobDownload(res.blob, res.filename ?? fallback);
      },
      error: (err: unknown) => {
        void this.materialDownloadHttpError(err).then((m) => this.materialDownloadError.set(m));
      },
    });
  }

  private triggerBlobDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.trim() || 'descarga';
    a.click();
    URL.revokeObjectURL(url);
  }

  private async messageIfBlobIsApiError(blob: Blob): Promise<string | null> {
    if (blob.type && blob.type !== 'application/json' && !blob.type.includes('json')) {
      return null;
    }
    if (blob.size > 8192) return null;
    const text = await blob.text();
    if (!text.trimStart().startsWith('{')) return null;
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      if (j?.error?.message?.trim()) return j.error.message.trim();
    } catch {
      return null;
    }
    return null;
  }

  private async materialDownloadHttpError(err: unknown): Promise<string> {
    const e = err as HttpErrorResponse;
    if (e?.error instanceof Blob) {
      try {
        const t = await e.error.text();
        const j = JSON.parse(t) as { error?: { message?: string } };
        if (j?.error?.message) return j.error.message;
      } catch {
        /* ignore */
      }
    }
    return 'No se pudo descargar el material. Si la sesión expiró, vuelve a iniciar sesión.';
  }

  getCourseName(): string {
    return (this.course()?.course?.name ?? this.course()?.name ?? '').trim();
  }

  courseCode(): string {
    return (this.course()?.code ?? this.course()?.course?.code ?? '').trim();
  }

  teacherName(): string {
    return (this.course()?.teacherName ?? '').trim();
  }

  heroMeta(): string {
    const c = this.course();
    const grade = (c?.course?.grade ?? c?.section?.grade ?? '').trim();
    const level = (c?.course?.level ?? '').trim();
    const year = (c?.academicYear?.name ?? c?.period ?? '').trim();
    return [this.teacherName(), [grade, level].filter(Boolean).join(' · '), year]
      .filter(Boolean)
      .join(' · ') || 'Santa María Laura';
  }

  dayHasClass(day: string): boolean {
    return (this.course()?.course?.schedule ?? []).some(s => s.day === day);
  }

  setTab(tab: TabType) {
    this.applyTab(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'material' ? null : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  toggleMaterialFolder(id: string) {
    this.materialExpanded.update((rec) => ({ ...rec, [id]: !rec[id] }));
  }

  isMaterialFolderOpen(id: string): boolean {
    return !!this.materialExpanded()[id];
  }

  binIsEmpty(bin: MaterialBin): boolean {
    return !bin.folders.length && !bin.files.length;
  }

  binCountLabel(bin: MaterialBin): string {
    const folders = bin.folders.length;
    const files = bin.files.length + bin.folders.reduce((n, f) => n + f.files.length, 0);
    if (!folders && !files) return 'Vacío';
    const parts: string[] = [];
    if (folders) parts.push(`${folders} ${folders === 1 ? 'carpeta' : 'carpetas'}`);
    parts.push(`${files} ${files === 1 ? 'archivo' : 'archivos'}`);
    return parts.join(' · ');
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

  taskStatusLabel(task: StudentTask): string {
    const st = (task.submission?.status ?? task.status ?? '').toUpperCase();
    if (st === 'GRADED') return 'Calificada';
    if (st === 'SUBMITTED' || st === 'APPROVED') return 'Entregada';
    return 'Pendiente';
  }

  taskIsDone(task: StudentTask): boolean {
    const st = (task.submission?.status ?? task.status ?? '').toUpperCase();
    return st === 'SUBMITTED' || st === 'GRADED' || st === 'APPROVED';
  }

  formatDueDate(raw?: string): string {
    if (!raw) return 'Sin fecha de entrega';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return `Entrega ${d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`;
  }

  formatGradeDate(g: StudentGrade): string {
    if (!g.createdAt) return '—';
    const d = new Date(g.createdAt);
    return Number.isNaN(d.getTime()) ? g.createdAt : d.toLocaleDateString('es-PE');
  }

  gradesCourseAverage(): string {
    const nums: number[] = [];
    for (const g of this.grades()) {
      if (g.score != null && Number.isFinite(Number(g.score))) nums.push(Number(g.score));
    }
    for (const t of this.tasks()) {
      const sc = t.submission?.score;
      if (sc != null && Number.isFinite(Number(sc))) nums.push(Number(sc));
    }
    if (!nums.length) return '—';
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    return String(Math.round(avg * 20) / 20);
  }

  periodScore(periodId: string): string {
    const g = this.grades().find(x => x.period?.id === periodId);
    if (g?.score == null || !Number.isFinite(Number(g.score))) return '—';
    return String(g.score);
  }

  attendanceStatusLabel(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'PRESENT') return 'Presente';
    if (s === 'LATE') return 'Tardanza';
    if (s === 'JUSTIFIED') return 'Justificada';
    if (s === 'ABSENT') return 'Falta';
    return status || '—';
  }

  formatSessionDate(raw: string): string {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  announcementPriorityLabel(priority?: string): string {
    const p = (priority || '').toUpperCase();
    if (p === 'HIGH' || p === 'URGENT') return 'Urgente';
    if (p === 'NORMAL' || p === 'MEDIUM') return 'Normal';
    return 'Aviso';
  }

  formatAnnouncementDate(raw?: string): string {
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  }

  authorName(a: Announcement): string {
    return `${a.author?.firstName ?? ''} ${a.author?.lastName ?? ''}`.trim()
      || a.author?.name
      || '';
  }
}
