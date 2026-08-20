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
  StudentExam,
} from '../../services/student.service';
import { AnnouncementService, Announcement } from '../../services/announcement.service';
import { isMaterialFolder, materialFolderTitle } from '../../services/teacher.service';
import { courseCoverAlt, resolveCourseCoverUrl } from '../../shared/utils/course-cover';
import {
  buildFolderContents,
  folderContentCountLabel,
  FolderContentEntry,
  isSafeHttpUrl,
  parseMaterialNotes,
} from '../../shared/utils/material-notes';

type TabType = 'material' | 'tareas' | 'notas' | 'asistencia' | 'comunicados';
type TaskFilter = 'all' | 'pending' | 'done';
type TaskKind = 'pendiente' | 'vencida' | 'entregada' | 'calificada';
type AnnFilter = 'all' | 'unread' | 'urgent';

interface MaterialBinFile {
  id: string;
  materialId: string;
  name: string;
  size?: number;
  mimeType?: string;
  createdAt?: string;
}

interface MaterialBinNote {
  id: string;
  kind: 'text' | 'link';
  title: string;
  body?: string;
  url?: string;
}

interface MaterialBinFolder {
  id: string;
  title: string;
  description?: string | null;
  createdAt?: string;
  files: MaterialBinFile[];
}

interface MaterialBin {
  id: string;
  title: string;
  roman: string;
  kind: 'period' | 'loose' | 'placeholder';
  files: MaterialBinFile[];
  folders: MaterialBinFolder[];
  notes: MaterialBinNote[];
}

export type CourseGradeRow = {
  id: string;
  kind: 'period' | 'task' | 'exam';
  taskId?: string;
  label: string;
  dateLabel: string;
  maxPoints: string;
  scoreDisplay: string;
  pctDisplay: string;
  notes?: string | null;
};

interface BimestreMark {
  id: string;
  roman: string;
  title: string;
  score: string;
}

interface AttendanceMonthGroup {
  key: string;
  label: string;
  items: StudentAttendance[];
}

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
  annFilter = signal<AnnFilter>('all');
  loading = signal(true);
  error = signal('');

  course = signal<StudentCourse | null>(null);
  materials = signal<StudentMaterial[]>([]);
  periods = signal<StudentPeriod[]>([]);
  materialsLoading = signal(false);
  materialExpanded = signal<Record<string, boolean>>({});
  openFolder = signal<MaterialBinFolder | null>(null);
  tasks = signal<StudentTask[]>([]);
  grades = signal<StudentGrade[]>([]);
  exams = signal<StudentExam[]>([]);
  examsLoading = signal(false);
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
          createdAt: f.createdAt,
        })),
      );
    const toNotes = (list: StudentMaterial[]): MaterialBinNote[] =>
      list.flatMap(m =>
        parseMaterialNotes(m.description).map((n, i) => ({
          id: `${m.id}-note-${i}`,
          kind: n.kind,
          title: n.title,
          body: n.body,
          url: n.url,
        })),
      );
    const toFolders = (list: StudentMaterial[]): MaterialBinFolder[] =>
      list
        .filter(isMaterialFolder)
        .map(m => ({
          id: m.id,
          title: materialFolderTitle(m),
          description: m.description,
          createdAt: m.createdAt,
          files: toFiles([m]),
        }));
    const split = (list: StudentMaterial[]) => ({
      folders: toFolders(list),
      files: toFiles(list.filter(m => !isMaterialFolder(m))),
      notes: toNotes(list.filter(m => !isMaterialFolder(m))),
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
          notes: [] as MaterialBinNote[],
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
  looseFolders = computed((): MaterialBinFolder[] => this.looseBin()?.folders ?? []);
  looseFiles = computed((): MaterialBinFile[] => this.looseBin()?.files ?? []);
  looseNotes = computed((): MaterialBinNote[] => this.looseBin()?.notes ?? []);
  hasLooseMaterial = computed(
    () => this.looseFolders().length + this.looseFiles().length + this.looseNotes().length > 0,
  );
  folderEntries = computed((): FolderContentEntry[] => {
    const folder = this.openFolder();
    if (!folder) return [];
    return buildFolderContents({
      materialId: folder.id,
      description: folder.description,
      createdAt: folder.createdAt,
      files: folder.files,
    });
  });

  filteredTasks = computed(() => {
    const f = this.taskFilter();
    const list = this.tasks().filter(t => {
      if (f === 'pending') return !this.taskIsDone(t);
      if (f === 'done') return this.taskIsDone(t);
      return true;
    });
    return [...list].sort((a, b) => this.taskSortRank(a) - this.taskSortRank(b));
  });

  overdueTasksCount = computed(() =>
    this.tasks().filter(t => this.taskKind(t) === 'vencida').length,
  );

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

  attendanceTotal = computed(() => {
    const s = this.attendanceSummary();
    return (s['PRESENT'] ?? 0) + (s['LATE'] ?? 0) + (s['JUSTIFIED'] ?? 0) + (s['ABSENT'] ?? 0);
  });

  attendanceBar = computed(() => {
    const total = this.attendanceTotal();
    const s = this.attendanceSummary();
    const seg = (key: string) => {
      const n = s[key] ?? 0;
      return { n, pct: total ? (n / total) * 100 : 0 };
    };
    return {
      present: seg('PRESENT'),
      late: seg('LATE'),
      justified: seg('JUSTIFIED'),
      absent: seg('ABSENT'),
    };
  });

  attendanceByMonth = computed((): AttendanceMonthGroup[] => {
    const map = new Map<string, StudentAttendance[]>();
    for (const row of this.attendance()) {
      const d = this.parseDay(row.date);
      const key = d
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : 'sin-fecha';
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, items]) => ({
        key,
        label: this.monthHeading(key, items[0]?.date),
        items,
      }));
  });

  unreadAnnouncementsCount = computed(() =>
    this.announcements().filter((a) => !a.isRead).length,
  );

  urgentAnnouncementsCount = computed(() =>
    this.announcements().filter((a) => this.isUrgentAnnouncement(a)).length,
  );

  filteredAnnouncements = computed(() => {
    const f = this.annFilter();
    return this.announcements().filter((a) => {
      if (f === 'unread') return !a.isRead;
      if (f === 'urgent') return this.isUrgentAnnouncement(a);
      return true;
    });
  });

  gradePeriods = computed(() => {
    const map = new Map<string, { id: string; name: string; order: number }>();
    for (const p of this.periods()) {
      map.set(p.id, { id: p.id, name: (p.name ?? '').trim() || 'Bimestre', order: p.order ?? 99 });
    }
    for (const g of this.grades()) {
      const id = g.period?.id;
      if (!id || map.has(id)) continue;
      map.set(id, { id, name: (g.period?.name ?? '').trim() || 'Bimestre', order: g.period?.order ?? 99 });
    }
    for (const e of this.exams()) {
      const id = e.period?.id ?? e.periodId;
      if (!id || map.has(id)) continue;
      map.set(id, { id, name: (e.period?.name ?? '').trim() || 'Bimestre', order: e.period?.order ?? 99 });
    }
    return [...map.values()].sort((a, b) => a.order - b.order).slice(0, 4);
  });

  bimestreMarks = computed((): BimestreMark[] => {
    const roman = ['I', 'II', 'III', 'IV'];
    const titles = ['I Bimestre', 'II Bimestre', 'III Bimestre', 'IV Bimestre'];
    const periods = this.gradePeriods();
    return titles.map((title, i) => {
      const period = periods[i];
      return {
        id: period?.id ?? `_ph-${i}`,
        roman: roman[i],
        title: period?.name || title,
        score: period ? this.periodScore(period.id) : '—',
      };
    });
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
          notes: null,
        },
      });
    }

    for (const t of this.tasks()) {
      const sub = t.submission;
      const st = (sub?.status || '').toUpperCase();
      const hasScore = sub?.score != null && Number.isFinite(Number(sub.score));
      const max = t.maxScore ?? 20;
      const scNum = hasScore ? Number(sub!.score) : NaN;
      const pct =
        hasScore && max > 0 && Number.isFinite(scNum)
          ? `${Math.round((scNum / max) * 1000) / 10}%`
          : '—';
      const dateRaw = sub?.gradedAt ?? sub?.submittedAt ?? t.dueDate;
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
          scoreDisplay: hasScore ? String(sub!.score) : '—',
          pctDisplay: pct,
          notes: sub?.feedback?.trim() || (st === 'SUBMITTED' || st === 'LATE' ? 'Entregada' : null),
        },
      });
    }

    for (const exam of this.exams()) {
      const d = exam.examDate ? new Date(exam.examDate) : null;
      const ts = d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
      const dateLabel =
        d && !Number.isNaN(d.getTime())
          ? d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
          : '—';
      const max = exam.maxScore || 20;
      const hasScore = exam.score != null && Number.isFinite(Number(exam.score));
      const pct =
        hasScore && max > 0
          ? `${Math.round((Number(exam.score) / max) * 1000) / 10}%`
          : '—';
      withTs.push({
        ts,
        row: {
          id: `exam-${exam.id}`,
          kind: 'exam',
          label: exam.title,
          dateLabel: exam.period?.name ? `${dateLabel} · ${exam.period.name}` : dateLabel,
          maxPoints: String(max),
          scoreDisplay: hasScore ? String(exam.score) : '—',
          pctDisplay: pct,
          notes: exam.notes?.trim() || null,
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
    if (tab !== 'material') this.openFolder.set(null);
    this.activeTab.set(tab);
    if (tab === 'tareas') this.loadTasks();
    if (tab === 'notas') {
      this.loadGrades();
      this.loadTasks();
      this.loadExams();
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

  loadExams() {
    this.examsLoading.set(true);
    this.studentService.getCourseExams(this.courseId()).subscribe({
      next: (data) => {
        this.exams.set(data);
        this.examsLoading.set(false);
      },
      error: () => {
        this.exams.set([]);
        this.examsLoading.set(false);
      },
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

  downloadFolderFile(item: FolderContentEntry) {
    if (!item.fileId) return;
    this.downloadMaterial({ id: item.fileId, name: item.title });
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
    if (tab !== 'material') {
      this.openFolder.set(null);
    } else if (this.activeTab() === 'material' && this.openFolder()) {
      this.openFolder.set(null);
      return;
    }
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

  openMaterialFolder(folder: MaterialBinFolder) {
    this.openFolder.set(folder);
  }

  closeMaterialFolder() {
    this.openFolder.set(null);
  }

  folderCountLabel(folder: MaterialBinFolder): string {
    return folderContentCountLabel(
      buildFolderContents({
        materialId: folder.id,
        description: folder.description,
        createdAt: folder.createdAt,
        files: folder.files,
      }),
    );
  }

  folderKindLabel(kind: FolderContentEntry['kind']): string {
    if (kind === 'link') return 'Enlace';
    if (kind === 'text') return 'Texto';
    return 'Archivo';
  }

  safeLink(url?: string | null): string | null {
    return isSafeHttpUrl(url) ? url! : null;
  }

  binIsEmpty(bin: MaterialBin): boolean {
    return !bin.folders.length && !bin.files.length && !bin.notes.length;
  }

  binCountLabel(bin: MaterialBin): string {
    const folders = bin.folders.length;
    const files = bin.files.length + bin.folders.reduce((n, f) => n + f.files.length, 0);
    const notes =
      bin.notes.length +
      bin.folders.reduce((n, f) => n + parseMaterialNotes(f.description).length, 0);
    if (!folders && !files && !notes) return 'Vacío';
    const parts: string[] = [];
    if (folders) parts.push(`${folders} ${folders === 1 ? 'carpeta' : 'carpetas'}`);
    if (files) parts.push(`${files} ${files === 1 ? 'archivo' : 'archivos'}`);
    if (notes) parts.push(`${notes} ${notes === 1 ? 'nota' : 'notas'}`);
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

  taskKind(task: StudentTask): TaskKind {
    const st = (task.submission?.status ?? task.status ?? '').toUpperCase();
    if (st === 'GRADED' || (task.submission?.score != null && Number.isFinite(Number(task.submission.score)))) {
      return 'calificada';
    }
    if (st === 'SUBMITTED' || st === 'APPROVED' || st === 'LATE') return 'entregada';
    if (this.taskIsOverdue(task)) return 'vencida';
    return 'pendiente';
  }

  taskStatusLabel(task: StudentTask): string {
    const kind = this.taskKind(task);
    if (kind === 'calificada') return 'Calificada';
    if (kind === 'entregada') return 'Entregada';
    if (kind === 'vencida') return 'Vencida';
    return 'Pendiente';
  }

  taskIsDone(task: StudentTask): boolean {
    const kind = this.taskKind(task);
    return kind === 'entregada' || kind === 'calificada';
  }

  taskIsOverdue(task: StudentTask): boolean {
    if (!task.dueDate) return false;
    const t = new Date(task.dueDate).getTime();
    return Number.isFinite(t) && t < Date.now();
  }

  taskCta(task: StudentTask): string {
    const kind = this.taskKind(task);
    if (kind === 'calificada') return 'Ver nota';
    if (kind === 'entregada') return 'Ver entrega';
    return 'Entregar';
  }

  deliveryLabel(task: StudentTask): string {
    const d = (task.deliveryType ?? '').toLowerCase();
    if (d === 'texto') return 'Texto';
    if (d === 'ambos') return 'Archivo o texto';
    if (d === 'clase') return 'En clase';
    return 'Archivo';
  }

  dueDay(raw?: string): string {
    if (!raw) return '—';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '—';
    return String(d.getDate());
  }

  dueMonth(raw?: string): string {
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
  }

  formatDueDate(raw?: string): string {
    if (!raw) return 'Sin fecha de entrega';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'long' });
  }

  private taskSortRank(task: StudentTask): number {
    const kind = this.taskKind(task);
    const due = task.dueDate ? new Date(task.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const dueSafe = Number.isFinite(due) ? due : Number.MAX_SAFE_INTEGER;
    if (kind === 'vencida') return dueSafe;
    if (kind === 'pendiente') return 1e13 + dueSafe;
    if (kind === 'entregada') return 2e13 + dueSafe;
    return 3e13 + dueSafe;
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
    for (const e of this.exams()) {
      if (e.score != null && Number.isFinite(Number(e.score))) nums.push(Number(e.score));
    }
    if (!nums.length) return '—';
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    return String(Math.round(avg * 20) / 20);
  }

  gradeKindLabel(kind: CourseGradeRow['kind']): string {
    if (kind === 'exam') return 'Examen';
    if (kind === 'task') return 'Tarea';
    return 'Bimestre';
  }

  gradeRowPending(row: CourseGradeRow): boolean {
    return row.scoreDisplay === '—';
  }

  scoreTone(row: CourseGradeRow): string {
    if (this.gradeRowPending(row)) return 'pending';
    let pct = NaN;
    if (row.pctDisplay !== '—') {
      pct = parseFloat(String(row.pctDisplay).replace('%', '').replace(',', '.'));
    } else {
      const sc = Number(row.scoreDisplay);
      const max = Number(row.maxPoints) || 20;
      if (Number.isFinite(sc) && max > 0) pct = (sc / max) * 100;
    }
    if (!Number.isFinite(pct)) return '';
    if (pct >= 70) return 'high';
    if (pct >= 55) return 'mid';
    return 'low';
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

  attendanceCount(key: string): number {
    return this.attendanceSummary()[key] ?? 0;
  }

  private parseDay(raw?: string): Date | null {
    if (!raw) return null;
    const iso = /^\d{4}-\d{2}-\d{2}/.test(raw) ? `${raw.slice(0, 10)}T12:00:00` : raw;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private monthHeading(key: string, sample?: string): string {
    if (key === 'sin-fecha') return 'Sin fecha';
    const d = this.parseDay(sample) ?? this.parseDay(`${key}-01`);
    if (!d) return key;
    const label = d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  sessionDay(raw?: string): string {
    const d = this.parseDay(raw);
    return d ? String(d.getDate()) : '—';
  }

  sessionMonth(raw?: string): string {
    const d = this.parseDay(raw);
    if (!d) return '';
    return d.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
  }

  formatSessionDate(raw: string): string {
    const d = this.parseDay(raw);
    if (!d) return raw;
    return d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  isUrgentAnnouncement(a: Announcement): boolean {
    return !!(a.urgent || (a.priority || '').toUpperCase() === 'HIGH' || (a.type || '').toUpperCase() === 'URGENT');
  }

  announcementTypeLabel(a: Announcement): string {
    const t = (a.type || '').toUpperCase();
    if (t === 'GENERAL') return 'General';
    if (t === 'ACADEMIC') return 'Académico';
    if (t === 'EVENT') return 'Evento';
    if (t === 'URGENT') return 'Aviso';
    return this.announcementPriorityLabel(a.priority);
  }

  announcementExcerpt(a: Announcement, max = 160): string {
    const raw = a.fullContent || a.content || '';
    const t = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    if (t.length <= max) return t;
    return `${t.slice(0, max).trim()}…`;
  }

  announcementAttachmentCount(a: Announcement): number {
    return a.attachmentCount ?? a.attachments?.length ?? 0;
  }

  announcementPriorityLabel(priority?: string): string {
    const p = (priority || '').toUpperCase();
    if (p === 'HIGH' || p === 'URGENT') return 'Urgente';
    if (p === 'NORMAL' || p === 'MEDIUM') return 'Normal';
    return 'Aviso';
  }

  authorName(a: Announcement): string {
    return `${a.author?.firstName ?? ''} ${a.author?.lastName ?? ''}`.trim()
      || a.author?.name
      || '';
  }
}
