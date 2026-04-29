import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ParentService, Child } from '../../../services/parent.service';

export type PadreNotaRowKind = 'periodo' | 'tarea';

export interface PadreNotaRow {
  id: string;
  kind: PadreNotaRowKind;
  courseName: string;
  label: string;
  dateLabel: string;
  scoreLabel: string;
  maxLabel: string;
  pctLabel: string;
  taskId?: string;
}

export interface PadreNotaCourseBlock {
  courseName: string;
  rows: PadreNotaRow[];
  average: string | null;
}

@Component({
  selector: 'app-notas-padre',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './notas-padre.component.html',
  styleUrl: './notas-padre.component.css',
})
export class NotasPadreComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedChildId = signal('');
  children = signal<Child[]>([]);
  grades = signal<unknown[]>([]);
  tasks = signal<unknown[]>([]);
  readonly isLoading = this.loading;

  selectedChild = computed(() => this.children().find((c) => c.id === this.selectedChildId()) ?? null);

  courseBlocks = computed((): PadreNotaCourseBlock[] => {
    const map = new Map<string, PadreNotaRow[]>();

    const push = (courseName: string, row: PadreNotaRow) => {
      const name = courseName.trim() || 'Sin curso';
      const list = map.get(name) ?? [];
      list.push(row);
      map.set(name, list);
    };

    for (const raw of this.grades()) {
      const g = raw as Record<string, unknown>;
      const score = this.extractNumericScore(g);
      if (score == null) continue;

      const courseName = this.extractCourseNameFromGrade(g);
      const dateRaw = g['createdAt'] ?? g['gradedAt'] ?? g['date'];
      const d = dateRaw ? new Date(String(dateRaw)) : null;
      const dateLabel =
        d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('es-PE') : '—';

      const periodName = this.extractPeriodName(g);
      const label = periodName
        ? `Período / examen: ${periodName}`
        : (String(g['title'] ?? g['description'] ?? 'Calificación')).trim() || 'Calificación';

      push(courseName, {
        id: `g-${String(g['id'] ?? `${label}-${dateLabel}-${score}`)}`,
        kind: 'periodo',
        courseName,
        label,
        dateLabel,
        scoreLabel: String(score),
        maxLabel: '—',
        pctLabel: '—',
      });
    }

    for (const raw of this.tasks()) {
      const t = raw as Record<string, unknown>;
      const row = this.mapGradedParentTask(t);
      if (!row) continue;
      push(row.courseName, row);
    }

    const blocks: PadreNotaCourseBlock[] = [];
    for (const [courseName, rows] of map.entries()) {
      rows.sort((a, b) => {
        const ta = Date.parse(a.dateLabel);
        const tb = Date.parse(b.dateLabel);
        return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
      });

      const nums: number[] = [];
      for (const r of rows) {
        if (r.scoreLabel !== '—' && Number.isFinite(Number(r.scoreLabel)))
          nums.push(Number(r.scoreLabel));
      }
      let average: string | null = null;
      if (nums.length) {
        const avg = nums.reduce((x, y) => x + y, 0) / nums.length;
        average = String(Math.round(avg * 20) / 20);
      }

      blocks.push({ courseName, rows, average });
    }

    return blocks.sort((a, b) => a.courseName.localeCompare(b.courseName, 'es'));
  });

  totalEvaluations = computed(() =>
    this.courseBlocks().reduce((acc, b) => acc + b.rows.length, 0),
  );

  overallAverage = computed(() => {
    const nums: number[] = [];
    for (const raw of this.grades()) {
      const g = raw as Record<string, unknown>;
      const sc = this.extractNumericScore(g);
      if (sc != null) nums.push(sc);
    }
    for (const raw of this.tasks()) {
      const t = raw as Record<string, unknown>;
      const sub = t['childSubmission'] as Record<string, unknown> | null | undefined;
      const sc = sub?.['score'];
      if (typeof sc === 'number' && !Number.isNaN(sc)) nums.push(sc);
    }
    if (!nums.length) return null as number | null;
    return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
  });

  constructor(
    private parentService: ParentService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.parentService.getChildren().subscribe({
      next: (data) => {
        this.children.set(data);
        if (!data.length) {
          this.loading.set(false);
          return;
        }
        const qId = this.route.snapshot.queryParamMap.get('childId');
        const initial =
          qId && data.some((c) => c.id === qId) ? qId! : data[0].id;
        this.selectedChildId.set(initial);
        this.loadGradesAndTasks(initial);
      },
      error: () => {
        this.error.set('Error al cargar hijos');
        this.loading.set(false);
      },
    });
  }

  selectChild(id: string) {
    this.selectedChildId.set(id);
    this.loadGradesAndTasks(id);
  }

  loadGradesAndTasks(childId: string) {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      grades: this.parentService.getChildGrades(childId),
      tasks: this.parentService.getChildTasks(childId, {}),
    }).subscribe({
      next: ({ grades, tasks }) => {
        this.grades.set(this.unwrapList(grades));
        this.tasks.set(this.unwrapList(tasks));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las notas.');
        this.grades.set([]);
        this.tasks.set([]);
        this.loading.set(false);
      },
    });
  }

  downloadBoleta() {
    const childId = this.selectedChildId();
    if (childId) window.open(this.parentService.getChildGradesExportUrl(childId));
  }

  getChildName(c: Child): string {
    return `${c.user.firstName} ${c.user.lastName}`;
  }

  isTaskRow(row: PadreNotaRow): boolean {
    return row.kind === 'tarea' && !!row.taskId;
  }

  pctClass(row: PadreNotaRow): Record<string, boolean> {
    if (row.pctLabel === '—') return {};
    const n = parseFloat(String(row.pctLabel).replace('%', '').replace(',', '.'));
    if (!Number.isFinite(n)) return {};
    return {
      'notas-pct--high': n >= 70,
      'notas-pct--mid': n >= 50 && n < 70,
      'notas-pct--low': n < 50,
    };
  }

  private unwrapList(raw: unknown): unknown[] {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      const inner = o['grades'] ?? o['data'] ?? o['items'];
      if (Array.isArray(inner)) return inner;
    }
    return [];
  }

  private extractNumericScore(g: Record<string, unknown>): number | null {
    const keys = ['score', 'value', 'grade', 'mark', 'nota', 'numericScore'];
    for (const k of keys) {
      const v = g[k];
      if (typeof v === 'number' && !Number.isNaN(v)) return v;
      if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v.replace(',', '.'));
        if (!Number.isNaN(n)) return n;
      }
    }
    return null;
  }

  private extractPeriodName(g: Record<string, unknown>): string {
    const p = g['period'] as Record<string, unknown> | undefined;
    const fromObj = p?.['name'] != null ? String(p['name']).trim() : '';
    if (fromObj) return fromObj;
    const direct = ['periodName', 'bimester', 'term', 'cuaderno', 'competencia'] as const;
    for (const k of direct) {
      const v = g[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
  }

  private extractCourseNameFromGrade(g: Record<string, unknown>): string {
    const ta = g['teacherAssignment'] as Record<string, unknown> | undefined;
    const c1 = ta?.['course'] as Record<string, unknown> | undefined;
    const fromTa = (c1?.['name'] as string) ?? '';
    if (fromTa.trim()) return fromTa.trim();
    const c2 = g['course'] as Record<string, unknown> | undefined;
    const fromG = (c2?.['name'] as string) ?? '';
    if (fromG.trim()) return fromG.trim();
    return 'Calificaciones generales';
  }

  private mapGradedParentTask(t: Record<string, unknown>): PadreNotaRow | null {
    const sub = t['childSubmission'] as Record<string, unknown> | null | undefined;
    if (!sub) return null;
    const st = String(sub['status'] ?? '').toUpperCase();
    const score = sub['score'];
    const hasScore = score != null && Number.isFinite(Number(score));
    if (st !== 'GRADED' && !hasScore) return null;

    const ta = t['teacherAssignment'] as Record<string, unknown> | undefined;
    const courseObj = ta?.['course'] as Record<string, unknown> | undefined;
    const courseName = (courseObj?.['name'] as string)?.trim() || 'Curso';

    const maxRaw = t['maxScore'];
    const max =
      typeof maxRaw === 'number' && maxRaw > 0
        ? maxRaw
        : Number(maxRaw) > 0
          ? Number(maxRaw)
          : 20;
    const scNum = hasScore ? Number(score) : NaN;
    const pct =
      hasScore && max > 0 && Number.isFinite(scNum)
        ? `${Math.round((scNum / max) * 1000) / 10}%`
        : '—';
    const dateRaw = sub['gradedAt'] ?? sub['submittedAt'] ?? t['dueDate'];
    const d = dateRaw ? new Date(dateRaw as string) : null;
    const dateLabel =
      d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('es-PE') : '—';

    return {
      id: `t-${String(t['id'] ?? '')}`,
      kind: 'tarea',
      courseName,
      label: String(t['title'] ?? 'Tarea'),
      dateLabel,
      scoreLabel: hasScore ? String(score) : '—',
      maxLabel: String(max),
      pctLabel: pct,
      taskId: String(t['id'] ?? ''),
    };
  }
}
