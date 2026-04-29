import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ParentService, Child } from '../../../services/parent.service';

export interface NotasCourseVm {
  id: string;
  name: string;
  average: string;
  /** Índice paralelo a periodLabels() */
  scores: (string | number)[];
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
  readonly isLoading = this.loading;

  selectedChild = computed(() => this.children().find((c) => c.id === this.selectedChildId()) ?? null);

  periodLabels = computed(() => {
    const labels: string[] = [];
    const seen = new Set<string>();
    for (const g of this.grades()) {
      const r = g as Record<string, unknown>;
      const p = r['period'] as Record<string, unknown> | undefined;
      const name = (p?.['name'] as string) ?? '';
      const trimmed = name.trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        labels.push(trimmed);
      }
    }
    labels.sort((a, b) => a.localeCompare(b, 'es'));
    return labels;
  });

  courses = computed((): NotasCourseVm[] => {
    const labels = this.periodLabels();
    const byTa = new Map<
      string,
      { name: string; sums: Map<string, number[]>; courseId: string }
    >();

    for (const raw of this.grades()) {
      const g = raw as Record<string, unknown>;
      const score = g['score'];
      if (typeof score !== 'number' || Number.isNaN(score)) continue;

      const ta = g['teacherAssignment'] as Record<string, unknown> | undefined;
      const id = String(ta?.['id'] ?? g['teacherAssignmentId'] ?? g['id']);
      const courseObj = ta?.['course'] as Record<string, unknown> | undefined;
      const courseName = (courseObj?.['name'] as string) ?? '—';

      const p = g['period'] as Record<string, unknown> | undefined;
      const pName = ((p?.['name'] as string) ?? '').trim();
      if (!pName) continue;

      let row = byTa.get(id);
      if (!row) {
        row = { name: courseName, sums: new Map(), courseId: id };
        byTa.set(id, row);
      }
      const arr = row.sums.get(pName) ?? [];
      arr.push(score);
      row.sums.set(pName, arr);
    }

    const out: NotasCourseVm[] = [];
    for (const [, row] of byTa) {
      const scores = labels.map((lab) => {
        const arr = row.sums.get(lab);
        if (!arr?.length) return '—';
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        return Math.round(avg * 20) / 20;
      });
      const numeric = scores.filter((x): x is number => typeof x === 'number');
      const average =
        numeric.length > 0
          ? String(Math.round((numeric.reduce((a, b) => a + b, 0) / numeric.length) * 20) / 20)
          : '—';
      out.push({
        id: row.courseId,
        name: row.name,
        average,
        scores: scores.map((x) => (typeof x === 'number' ? x : '—')),
      });
    }
    out.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return out;
  });

  overallAverage = computed(() => {
    const nums: number[] = [];
    for (const raw of this.grades()) {
      const g = raw as Record<string, unknown>;
      const score = g['score'];
      if (typeof score === 'number' && !Number.isNaN(score)) nums.push(score);
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
        this.loadGrades(initial);
      },
      error: () => {
        this.error.set('Error al cargar hijos');
        this.loading.set(false);
      },
    });
  }

  selectChild(id: string) {
    this.selectedChildId.set(id);
    this.loadGrades(id);
  }

  loadGrades(childId: string) {
    this.loading.set(true);
    this.error.set('');
    this.parentService.getChildGrades(childId).subscribe({
      next: (data) => {
        this.grades.set(Array.isArray(data) ? data : []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las notas.');
        this.grades.set([]);
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
}
