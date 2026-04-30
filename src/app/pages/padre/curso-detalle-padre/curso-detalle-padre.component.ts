import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ParentService } from '../../../services/parent.service';

type TabType = 'informacion' | 'materiales' | 'tareas';

export interface ParentCourseDetailVm {
  name: string;
  code: string;
  academicYear: string;
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

  courseVm = signal<ParentCourseDetailVm | null>(null);
  units = signal<Record<string, unknown>[]>([]);
  tasks = signal<ParentCourseTaskRow[]>([]);

  /** ID tabla `Teacher` (para crear conversación). */
  teacherEntityId = '';

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
      units: this.parentService
        .getChildCourseUnits(this.childId, this.courseId)
        .pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ course, units }) => {
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
        this.units.set(this.normalizeUnits(units as unknown[]));
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

  toggleUnit(unitId: string) {
    this.units.update((list) =>
      list.map((u) =>
        String(u['id']) === unitId ? { ...u, isExpanded: !Boolean(u['isExpanded']) } : u,
      ),
    );
  }

  getMaterialIcon(type: string): string {
    const t = (type || '').toLowerCase();
    if (t === 'pdf' || t.includes('pdf')) return 'fa-file-pdf';
    if (t === 'video' || t.includes('video')) return 'fa-video';
    if (t === 'imagen' || t.includes('image')) return 'fa-file-image';
    if (t === 'link') return 'fa-link';
    return 'fa-file';
  }

  downloadMaterial(material: Record<string, unknown>) {
    const type = String(material['type'] ?? '');
    if (type === 'Link') {
      const url = (material['url'] as string) ?? '';
      if (url) window.open(url, '_blank');
      return;
    }
    const mid = material['id'];
    if (mid != null && this.childId && this.courseId) {
      window.open(
        this.parentService.getChildCourseMaterialDownloadUrl(this.childId, this.courseId, String(mid)),
      );
    }
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

  private buildCourseVm(raw: unknown): ParentCourseDetailVm {
    const a = raw as Record<string, unknown>;
    const course = (a['course'] as Record<string, unknown>) ?? {};
    const teacher = (a['teacher'] as Record<string, unknown>) ?? {};
    const user = (teacher['user'] as Record<string, unknown>) ?? {};
    const academicYear = (a['academicYear'] as Record<string, unknown>) ?? {};

    const fn = (user['firstName'] as string) ?? '';
    const ln = (user['lastName'] as string) ?? '';
    const teacherName = `${fn} ${ln}`.trim() || '—';

    let avg = '—';
    if (a['averageScore'] != null && Number.isFinite(Number(a['averageScore']))) {
      avg = String(a['averageScore']);
    } else if (a['average'] != null && `${a['average']}`.trim() !== '') {
      avg = String(a['average']);
    }

    const scheduleRows = this.scheduleRowsFromField(
      course['schedule'] ?? a['schedule'],
    );

    return {
      name: (course['name'] as string) ?? '—',
      code: (course['code'] as string) ?? '—',
      academicYear: (academicYear['name'] as string) ?? '—',
      average: avg,
      teacher: teacherName,
      teacherEmail: (user['email'] as string) ?? '',
      teacherPhone: (user['phone'] as string) ?? (teacher['phone'] as string) ?? '',
      teacherAvatar: (user['avatarUrl'] as string) ?? null,
      schedule: scheduleRows.length ? scheduleRows : [],
    };
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
          return { day: dayStr, time: timeRange };
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

  private normalizeUnits(raw: unknown[]): Record<string, unknown>[] {
    return (Array.isArray(raw) ? raw : []).map((u) => {
      const x = u as Record<string, unknown>;
      const materialsRaw = x['materials'];
      const materials = Array.isArray(materialsRaw)
        ? materialsRaw.map((m) => this.normalizeMaterial(m as Record<string, unknown>))
        : [];
      const numRaw = x['number'];
      const num =
        numRaw === null || numRaw === undefined
          ? null
          : typeof numRaw === 'number'
            ? numRaw
            : Number(numRaw);
      return {
        ...x,
        isExpanded: x['isExpanded'] === true,
        number: num !== null && Number.isFinite(num) ? num : null,
        title: String(x['title'] ?? ''),
        description: String(x['description'] ?? ''),
        materials,
      };
    });
  }

  private normalizeMaterial(m: Record<string, unknown>): Record<string, unknown> {
    const apiTypes = new Set(['PDF', 'Video', 'Imagen', 'Documento', 'Otro', 'Link']);
    const dt = m['type'];
    if (typeof dt === 'string' && apiTypes.has(dt)) {
      return {
        id: m['id'],
        name: String(m['title'] ?? m['name'] ?? m['originalName'] ?? 'Material'),
        type: dt,
        size: typeof m['size'] === 'string' && m['size'].trim() ? m['size'] : this.kbFromSizeBytes(m['sizeBytes']),
        date: String(m['date'] ?? m['createdAt'] ?? m['updatedAt'] ?? ''),
        url: String((m['externalUrl'] ?? m['url'] ?? m['fileUrl'] ?? '') as string),
      };
    }

    const mime = String(m['mimeType'] ?? '').toLowerCase();
    const extType = String(m['type'] ?? '').toLowerCase();
    let type = 'Documento';
    if (mime.includes('pdf') || extType === 'pdf') type = 'PDF';
    else if (mime.startsWith('video')) type = 'Video';
    else if (mime.startsWith('image')) type = 'Imagen';

    const externalUrl =
      (m['externalUrl'] as string) ?? (m['url'] as string) ?? (m['fileUrl'] as string) ?? '';
    if (externalUrl && /^https?:\/\//i.test(externalUrl)) type = 'Link';

    const created = m['createdAt'] ?? m['updatedAt'] ?? '';

    return {
      id: m['id'],
      name: String(m['title'] ?? m['name'] ?? m['originalName'] ?? 'Material'),
      type,
      size: this.kbFromSizeBytes(m['sizeBytes']),
      date: created,
      url: externalUrl,
    };
  }

  private kbFromSizeBytes(sizeBytes: unknown): string {
    if (typeof sizeBytes !== 'number' || sizeBytes <= 0) return '';
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
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