import { Component, signal, computed, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { StudentService, StudentCourse, StudentTask, StudentGrade } from '../../services/student.service';

type TabType = 'contenido' | 'tareas' | 'calificaciones' | 'comunicados' | 'mensajes' | 'foros' | 'compañeros';

/** Fila unificada: notas de período + tareas calificadas */
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
  activeTab = signal<TabType>('contenido');
  loading = signal(true);
  error = signal('');

  course = signal<StudentCourse | null>(null);
  units = signal<unknown[]>([]);
  tasks = signal<StudentTask[]>([]);
  grades = signal<StudentGrade[]>([]);
  /** Descarga de materiales del curso requiere token (no abrir URL en nueva pestaña). */
  materialDownloadError = signal('');

  courseGradeRows = computed((): CourseGradeRow[] => {
    const withTs: { row: CourseGradeRow; ts: number }[] = [];

    for (const g of this.grades()) {
      const ts = g.createdAt ? new Date(g.createdAt).getTime() : 0;
      withTs.push({
        ts: Number.isFinite(ts) ? ts : 0,
        row: {
          id: `grade-${g.id}`,
          kind: 'period',
          label: g.period?.name?.trim() ? `Período: ${g.period.name}` : 'Calificación del período',
          dateLabel: this.formatGradeDate(g),
          maxPoints: '—',
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
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.courseId.set(id);

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const tab = this.tabFromQuery(params.get('tab')) ?? 'contenido';
      if (tab !== this.activeTab()) {
        this.activeTab.set(tab);
        if (tab === 'tareas') this.loadTasks();
        if (tab === 'calificaciones') {
          this.loadGrades();
          this.loadTasks();
        }
      }
    });

    this.loadCourse();
    this.loadUnits();
  }

  private tabFromQuery(raw: string | null): TabType | null {
    if (!raw) return null;
    const allowed: TabType[] = ['contenido', 'tareas', 'calificaciones', 'comunicados', 'mensajes', 'foros', 'compañeros'];
    return allowed.includes(raw as TabType) ? (raw as TabType) : null;
  }

  loadCourse() {
    this.studentService.getCourse(this.courseId()).subscribe({
      next: (data) => { this.course.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar el curso'); this.loading.set(false); }
    });
  }

  loadUnits() {
    this.studentService.getCourseUnits(this.courseId()).subscribe({
      next: (data) => this.units.set(data)
    });
  }

  selectTab(tab: TabType) {
    this.activeTab.set(tab);
    if (tab === 'tareas') this.loadTasks();
    if (tab === 'calificaciones') {
      this.loadGrades();
      this.loadTasks();
    }
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

  getCourseName(): string { return this.course()?.course.name ?? ''; }

  setTab(tab: TabType) {
    this.selectTab(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'contenido' ? null : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  taskStatusLabel(task: StudentTask): string {
    const st = (task.submission?.status ?? task.status ?? '').toUpperCase();
    if (st === 'SUBMITTED' || st === 'GRADED') return 'Entregada';
    return 'Pendiente';
  }

  taskIsDone(task: StudentTask): boolean {
    const st = (task.submission?.status ?? task.status ?? '').toUpperCase();
    return st === 'SUBMITTED' || st === 'GRADED' || st === 'APPROVED';
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

  toggleUnit(unitId: string) {
    this.units.update((list) =>
      (list as Record<string, unknown>[]).map((u) =>
        String(u['id']) === unitId ? { ...u, isExpanded: !Boolean(u['isExpanded']) } : u,
      ),
    );
  }
}
