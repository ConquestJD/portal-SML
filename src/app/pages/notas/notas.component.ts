import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { StudentService, StudentGrade, StudentTask } from '../../services/student.service';

export type NotaRowKind = 'periodo' | 'tarea';

export interface NotaRow {
  id: string;
  kind: NotaRowKind;
  courseName: string;
  label: string;
  dateLabel: string;
  scoreLabel: string;
  maxLabel: string;
  pctLabel: string;
  taskId?: string;
}

export interface NotaCourseBlock {
  courseName: string;
  rows: NotaRow[];
  average: string | null;
}

@Component({
  selector: 'app-notas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notas.component.html',
  styleUrl: './notas.component.css',
})
export class NotasComponent implements OnInit {
  private readonly studentService = inject(StudentService);

  loading = signal(true);
  error = signal('');
  grades = signal<StudentGrade[]>([]);
  tasks = signal<StudentTask[]>([]);

  /** Bloques por curso + filas ordenadas */
  courseBlocks = computed((): NotaCourseBlock[] => {
    const map = new Map<string, NotaRow[]>();

    const push = (courseName: string, row: NotaRow) => {
      const name = courseName.trim() || 'Sin curso';
      const list = map.get(name) ?? [];
      list.push(row);
      map.set(name, list);
    };

    for (const g of this.grades()) {
      const courseName = g.course?.name ?? 'Calificaciones generales';
      const dateRaw = g.createdAt;
      const d = dateRaw ? new Date(dateRaw) : null;
      const dateLabel =
        d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('es-PE') : '—';
      const label =
        g.period?.name?.trim() ? `Período: ${g.period.name}` : 'Calificación del período';
      push(courseName, {
        id: `g-${g.id}`,
        kind: 'periodo',
        courseName,
        label,
        dateLabel,
        scoreLabel: g.score != null ? String(g.score) : '—',
        maxLabel: '—',
        pctLabel: '—',
      });
    }

    for (const t of this.tasks()) {
      const sub = t.submission;
      if (!sub) continue;
      const st = (sub.status || '').toUpperCase();
      const hasScore = sub.score != null && Number.isFinite(Number(sub.score));
      if (st !== 'GRADED' && !hasScore) continue;

      const courseName = t.course?.name?.trim() || 'Curso';
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

      push(courseName, {
        id: `t-${t.id}`,
        kind: 'tarea',
        courseName,
        label: t.title,
        dateLabel,
        scoreLabel: hasScore ? String(sub.score) : '—',
        maxLabel: String(max),
        pctLabel: pct,
        taskId: t.id,
      });
    }

    const blocks: NotaCourseBlock[] = [];
    for (const [courseName, rows] of map.entries()) {
      rows.sort((a, b) => {
        const tsa = (() => {
          const d = new Date(a.dateLabel);
          return Number.isNaN(d.getTime()) ? 0 : d.getTime();
        })();
        const tsb = (() => {
          const d = new Date(b.dateLabel);
          return Number.isNaN(d.getTime()) ? 0 : d.getTime();
        })();
        return tsb - tsa;
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
    for (const g of this.grades()) {
      if (g.score != null && Number.isFinite(Number(g.score))) nums.push(Number(g.score));
    }
    for (const t of this.tasks()) {
      const sc = t.submission?.score;
      if (sc != null && Number.isFinite(Number(sc))) nums.push(Number(sc));
    }
    if (!nums.length) return null;
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    return String(Math.round(avg * 20) / 20);
  });

  ngOnInit() {
    this.loading.set(true);
    forkJoin({
      grades: this.studentService.getGrades({}),
      tasks: this.studentService.getTasks({}),
    }).subscribe({
      next: ({ grades, tasks }) => {
        this.grades.set(grades);
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las notas.');
        this.loading.set(false);
      },
    });
  }

  exportGrades() {
    window.open(this.studentService.getGradesExportUrl(undefined));
  }

  isTaskRow(row: NotaRow): boolean {
    return row.kind === 'tarea' && !!row.taskId;
  }

  pctClass(row: NotaRow): Record<string, boolean> {
    if (row.pctLabel === '—') return {};
    const n = parseFloat(String(row.pctLabel).replace('%', '').replace(',', '.'));
    if (!Number.isFinite(n)) return {};
    return {
      'notas-pct--high': n >= 70,
      'notas-pct--mid': n >= 50 && n < 70,
      'notas-pct--low': n < 50,
    };
  }
}
