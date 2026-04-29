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
  schedule: { day: string; time: string }[];
  classroom: string;
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
    void this.router.navigate(['/padre/mensajeria'], { queryParams: { childId: this.childId } });
  }

  private buildCourseVm(raw: unknown): ParentCourseDetailVm {
    const a = raw as Record<string, unknown>;
    const course = (a['course'] as Record<string, unknown>) ?? {};
    const teacher = (a['teacher'] as Record<string, unknown>) ?? {};
    const user = (teacher['user'] as Record<string, unknown>) ?? {};
    const section = (a['section'] as Record<string, unknown>) ?? {};
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

    const scheduleStr = this.formatScheduleField(course['schedule']);
    const schedule = scheduleStr !== '—' ? [{ day: 'Horario', time: scheduleStr }] : [];

    const grade = (section['grade'] as string) ?? '';
    const secName = (section['name'] as string) ?? '';
    const classroom = [grade, secName].filter((x) => x && String(x).trim()).join(' · ') || '—';

    return {
      name: (course['name'] as string) ?? '—',
      code: (course['code'] as string) ?? '—',
      academicYear: (academicYear['name'] as string) ?? '—',
      average: avg,
      teacher: teacherName,
      teacherEmail: (user['email'] as string) ?? '',
      teacherPhone: (user['phone'] as string) ?? (teacher['phone'] as string) ?? '',
      teacherAvatar: (user['avatarUrl'] as string) ?? null,
      schedule,
      classroom,
    };
  }

  private formatScheduleField(s: unknown): string {
    if (s == null) return '—';
    if (typeof s === 'string') return s.trim() || '—';
    if (Array.isArray(s) && s.length) {
      const parts = (s as Record<string, unknown>[])
        .map((x) => {
          const day = x['day'] ?? x['día'];
          const start = x['start'] ?? x['inicio'];
          const end = x['end'] ?? x['fin'];
          const bits = [day, start, end].filter((v) => v != null && String(v).trim() !== '');
          return bits.map(String).join(' ');
        })
        .filter(Boolean);
      return parts.length ? parts.join(' · ') : '—';
    }
    if (typeof s === 'object' && s !== null) {
      const o = s as Record<string, unknown>;
      if (typeof o['label'] === 'string' && o['label'].trim()) return o['label'];
      if (typeof o['text'] === 'string' && o['text'].trim()) return o['text'];
    }
    return '—';
  }

  private normalizeUnits(raw: unknown[]): Record<string, unknown>[] {
    return (Array.isArray(raw) ? raw : []).map((u) => {
      const x = u as Record<string, unknown>;
      const materialsRaw = x['materials'];
      const materials = Array.isArray(materialsRaw)
        ? materialsRaw.map((m) => this.normalizeMaterial(m as Record<string, unknown>))
        : [];
      const num = typeof x['number'] === 'number' ? x['number'] : Number(x['number']);
      return {
        ...x,
        isExpanded: false,
        number: Number.isFinite(num) ? num : 0,
        title: String(x['title'] ?? ''),
        description: String(x['description'] ?? ''),
        materials,
      };
    });
  }

  private normalizeMaterial(m: Record<string, unknown>): Record<string, unknown> {
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
    const sizeBytes = m['sizeBytes'];
    let size = '';
    if (typeof sizeBytes === 'number' && sizeBytes > 0) {
      size = `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
    }

    return {
      id: m['id'],
      name: String(m['title'] ?? m['name'] ?? m['originalName'] ?? 'Material'),
      type,
      size,
      date: created,
      url: externalUrl,
    };
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