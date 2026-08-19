import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ParentService, ParentMaterial, ParentPeriod } from '../../../services/parent.service';
import { isMaterialFolder, materialFolderTitle } from '../../../services/teacher.service';

type TabType = 'informacion' | 'materiales' | 'tareas';

export interface ParentCourseDetailVm {
  name: string;
  code: string;
  description: string;
  gradeLine: string;
  academicYear: string;
  hours: number | null;
  average: string;
  teacher: string;
  teacherEmail: string;
  teacherPhone: string;
  teacherAvatar?: string | null;
  /** Una fila por franja: día + rango horario */
  schedule: { day: string; time: string }[];
}

export interface ParentCourseTaskRow {
  id: string;
  title: string;
  dueDate: string | Date | null;
  status: 'pendiente' | 'entregada' | 'vencida';
  submitted: boolean;
  submittedDate: string | Date | null;
  grade: number | null;
}

interface MaterialBinFile {
  id: string;
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

@Component({
  selector: 'app-curso-detalle-padre',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './curso-detalle-padre.component.html',
  styleUrl: './curso-detalle-padre.component.css',
})
export class CursoDetallePadreComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  readonly isLoading = this.loading;

  childId = '';
  courseId = '';
  activeTab = signal<TabType>('informacion');

  readonly weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  readonly weekDayShort = ['L', 'M', 'X', 'J', 'V', 'S'];

  courseVm = signal<ParentCourseDetailVm | null>(null);
  periods = signal<ParentPeriod[]>([]);
  materials = signal<ParentMaterial[]>([]);
  materialExpanded = signal<Record<string, boolean>>({});
  tasks = signal<ParentCourseTaskRow[]>([]);

  /** ID tabla `Teacher` (para crear conversación). */
  teacherEntityId = '';

  materialGroups = computed((): MaterialBin[] => {
    const materials = this.materials();
    const toFiles = (list: ParentMaterial[]): MaterialBinFile[] =>
      list.flatMap((m) =>
        (m.files ?? []).map((f) => ({
          id: f.id,
          name: (f.filename ?? f.name ?? '').trim() || 'Archivo',
          size: f.size,
          mimeType: f.mimeType,
        })),
      );
    const toFolders = (list: ParentMaterial[]): MaterialBinFolder[] =>
      list
        .filter(isMaterialFolder)
        .map((m) => ({
          id: m.id,
          title: materialFolderTitle(m),
          files: toFiles([m]),
        }));
    const split = (list: ParentMaterial[]) => ({
      folders: toFolders(list),
      files: toFiles(list.filter((m) => !isMaterialFolder(m))),
    });
    const inPeriod = (periodId: string) =>
      materials.filter((m) => (m.periodId ?? m.period?.id) === periodId);

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
      ...split(materials.filter((m) => !(m.periodId ?? m.period?.id))),
    });
    return bins;
  });

  bimestreBins = computed(() => this.materialGroups().filter((b) => b.kind !== 'loose'));
  looseFiles = computed((): MaterialBinFile[] => {
    const loose = this.materialGroups().find((b) => b.kind === 'loose');
    if (!loose) return [];
    return [...loose.folders.flatMap((f) => f.files), ...loose.files];
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private parentService: ParentService,
  ) {}

  ngOnInit() {
    this.courseId = this.route.snapshot.paramMap.get('id') ?? '';
    let childId = this.route.snapshot.queryParamMap.get('childId') ?? '';

    if (!this.courseId) {
      this.error.set('Curso no especificado');
      this.loading.set(false);
      return;
    }

    if (!childId) {
      this.parentService.getChildren().subscribe({
        next: (kids) => {
          if (kids.length) {
            this.childId = kids[0].id;
            this.loadCourseBundle();
          } else {
            this.error.set('No hay hijos vinculados a tu cuenta.');
            this.loading.set(false);
          }
        },
        error: () => {
          this.error.set('Error al cargar hijos');
          this.loading.set(false);
        },
      });
      return;
    }

    this.childId = childId;
    this.loadCourseBundle();
  }

  private loadCourseBundle() {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      course: this.parentService
        .getChildCourse(this.childId, this.courseId)
        .pipe(catchError(() => of(null))),
      archive: this.parentService
        .getChildCourseMaterials(this.childId, this.courseId)
        .pipe(catchError(() => of({ periods: [], materials: [] }))),
    }).subscribe({
      next: ({ course, archive }) => {
        if (!course) {
          this.error.set('Error al cargar el curso');
          this.courseVm.set(null);
          this.loading.set(false);
          return;
        }
        this.courseVm.set(this.buildCourseVm(course));
        const a = course as Record<string, unknown>;
        const teacher = (a['teacher'] as Record<string, unknown>) ?? {};
        this.teacherEntityId = String(teacher['id'] ?? '');
        this.periods.set(archive.periods ?? []);
        this.materials.set(archive.materials ?? []);
        this.loading.set(false);
        if (this.activeTab() === 'tareas') this.loadTasks();
      },
      error: () => {
        this.error.set('Error al cargar el curso');
        this.loading.set(false);
      },
    });
  }

  setTab(tab: TabType) {
    this.selectTab(tab);
  }

  selectTab(tab: TabType) {
    this.activeTab.set(tab);
    if (tab === 'tareas') this.loadTasks();
  }

  loadTasks() {
    if (!this.childId || !this.courseId) return;
    this.parentService.getChildCourseTasks(this.childId, this.courseId).subscribe({
      next: (data) => {
        const arr = Array.isArray(data) ? data : [];
        this.tasks.set(arr.map((t) => this.mapApiTask(t as Record<string, unknown>)));
      },
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

  downloadMaterial(file: MaterialBinFile) {
    if (!file.id || !this.childId || !this.courseId) return;
    window.open(
      this.parentService.getChildCourseMaterialDownloadUrl(this.childId, this.courseId, file.id),
    );
  }

  sendMessageToTeacher() {
    void this.router.navigate(['/padre/mensajeria'], {
      queryParams: {
        childId: this.childId,
        assignmentId: this.courseId,
        teacherId: this.teacherEntityId,
      },
    });
  }

  dayHasClass(c: ParentCourseDetailVm, day: string): boolean {
    return c.schedule.some((s) => this.normalizeDay(s.day) === day);
  }

  taskStatusLabel(status: ParentCourseTaskRow['status']): string {
    const map: Record<ParentCourseTaskRow['status'], string> = {
      pendiente: 'Pendiente',
      entregada: 'Entregada',
      vencida: 'Vencida',
    };
    return map[status];
  }

  taskStatusMark(status: ParentCourseTaskRow['status']): string {
    if (status === 'entregada') return '✓';
    if (status === 'vencida') return '!';
    return '◷';
  }

  private buildCourseVm(raw: unknown): ParentCourseDetailVm {
    const a = raw as Record<string, unknown>;
    const course = (a['course'] as Record<string, unknown>) ?? {};
    const teacher = (a['teacher'] as Record<string, unknown>) ?? {};
    const user = (teacher['user'] as Record<string, unknown>) ?? {};
    const fn = (user['firstName'] as string) ?? '';
    const ln = (user['lastName'] as string) ?? '';
    const teacherName = `${fn} ${ln}`.trim() || '—';

    let avg = '—';
    if (a['averageScore'] != null && Number.isFinite(Number(a['averageScore']))) {
      avg = String(a['averageScore']);
    } else if (a['average'] != null && `${a['average']}`.trim() !== '') {
      avg = String(a['average']);
    }

    const academicYearObj =
      (a['academicYear'] as Record<string, unknown> | undefined) ??
      ((a['section'] as Record<string, unknown> | undefined)?.['academicYear'] as Record<string, unknown> | undefined) ??
      {};
    const section = (a['section'] as Record<string, unknown> | undefined) ?? {};
    const grade = String(course['grade'] ?? section['grade'] ?? '').trim();
    const level = String(course['level'] ?? section['level'] ?? '').trim();
    const hours = typeof course['hours'] === 'number' ? course['hours'] : null;
    const description = String(course['description'] ?? '').trim();

    const scheduleRows = this.scheduleRowsFromField(
      course['schedule'] ?? a['schedule'],
    );

    return {
      name: (course['name'] as string) ?? '—',
      code: (course['code'] as string) ?? '—',
      description,
      gradeLine: [grade, level].filter(Boolean).join(' · '),
      academicYear: String(academicYearObj['name'] ?? '—'),
      hours,
      average: avg,
      teacher: teacherName,
      teacherEmail: (user['email'] as string) ?? '',
      teacherPhone: (user['phone'] as string) ?? (teacher['phone'] as string) ?? '',
      teacherAvatar: (user['avatarUrl'] as string) ?? null,
      schedule: scheduleRows.length ? scheduleRows : [],
    };
  }

  private normalizeDay(raw: string): string {
    const key = raw.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const map: Record<string, string> = {
      lunes: 'Lunes',
      lun: 'Lunes',
      monday: 'Lunes',
      martes: 'Martes',
      mar: 'Martes',
      tuesday: 'Martes',
      miercoles: 'Miércoles',
      mie: 'Miércoles',
      wednesday: 'Miércoles',
      jueves: 'Jueves',
      jue: 'Jueves',
      thursday: 'Jueves',
      viernes: 'Viernes',
      vie: 'Viernes',
      friday: 'Viernes',
      sabado: 'Sábado',
      sab: 'Sábado',
      saturday: 'Sábado',
    };
    return map[key] ?? raw.trim();
  }

  /** Construye filas día + horas a partir del JSON de horario del curso. */
  private scheduleRowsFromField(s: unknown): { day: string; time: string }[] {
    if (s == null) return [];
    if (typeof s === 'string') {
      const t = s.trim();
      return t ? [{ day: 'Horario', time: t }] : [];
    }
    if (Array.isArray(s) && s.length) {
      return (s as Record<string, unknown>[])
        .map((x) => {
          const dateOnly = x['date'] ?? x['fecha'] ?? x['classDate'];
          const day =
            x['day'] ??
            x['día'] ??
            x['dayOfWeek'] ??
            x['weekday'] ??
            x['dayName'] ??
            x['nombreDia'] ??
            (dateOnly != null && String(dateOnly).trim() !== ''
              ? this.dayLabelFromDate(String(dateOnly))
              : null) ??
            x['label'];
          const start =
            x['start'] ?? x['inicio'] ?? x['startTime'] ?? x['horaInicio'] ?? x['from'];
          const end = x['end'] ?? x['fin'] ?? x['endTime'] ?? x['horaFin'] ?? x['to'];
          let timeRange = this.formatTimeRange(start, end);
          let dayStr = day != null && String(day).trim() !== '' ? String(day) : '—';
          if (dayStr === '—' && dateOnly != null && String(dateOnly).trim() !== '') {
            dayStr = this.dayLabelFromDate(String(dateOnly));
          }
          if (timeRange === '—' && dateOnly && (start || end)) {
            timeRange = this.formatTimeRange(dateOnly, null);
            if (start || end) {
              const rest = this.formatTimeRange(start, end);
              if (rest !== '—') timeRange = `${timeRange.split(' – ')[0] ?? timeRange} (${rest})`;
            }
          }
          if (timeRange === '—') {
            timeRange = this.formatTimeRange(x['time'], null);
          }
          return { day: this.normalizeDay(dayStr), time: timeRange };
        })
        .filter((r) => r.day !== '—' || r.time !== '—');
    }
    if (typeof s === 'object') {
      const o = s as Record<string, unknown>;
      const label = o['label'] ?? o['text'];
      if (typeof label === 'string' && label.trim()) {
        return [{ day: 'Horario', time: label.trim() }];
      }
    }
    return [];
  }

  private formatTimeRange(start: unknown, end: unknown): string {
    const fmt = (v: unknown): string => {
      if (v == null || v === '') return '';
      if (typeof v === 'string') {
        const t = v.trim();
        if (!t) return '';
        const d = new Date(t);
        if (!Number.isNaN(d.getTime()) && (t.includes('T') || t.includes(':'))) {
          return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        }
        return t;
      }
      return String(v);
    };
    const a = fmt(start);
    const b = fmt(end);
    if (a && b) return `${a} – ${b}`;
    return a || b || '—';
  }

  private dayLabelFromDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' });
  }

  private mapApiTask(t: Record<string, unknown>): ParentCourseTaskRow {
    const sub = t['childSubmission'] as Record<string, unknown> | null | undefined;
    const hasSubmission = sub != null;
    const grade = typeof sub?.['score'] === 'number' ? (sub['score'] as number) : null;

    let status: ParentCourseTaskRow['status'];
    if (hasSubmission) {
      status = 'entregada';
    } else {
      const dueRaw = t['dueDate'];
      const due = dueRaw ? new Date(dueRaw as string) : null;
      const startToday = new Date();
      startToday.setHours(0, 0, 0, 0);
      if (due != null && !Number.isNaN(due.getTime()) && due < startToday) {
        status = 'vencida';
      } else {
        status = 'pendiente';
      }
    }

    const submittedDate =
      (sub?.['submittedAt'] as string | Date | undefined) ??
      (sub?.['gradedAt'] as string | Date | undefined) ??
      null;

    return {
      id: String(t['id'] ?? ''),
      title: String(t['title'] ?? ''),
      dueDate: (t['dueDate'] as string | Date | null) ?? null,
      status,
      submitted: hasSubmission,
      submittedDate,
      grade,
    };
  }
}