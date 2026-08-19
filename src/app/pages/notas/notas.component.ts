import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { StudentService, StudentExam, StudentGrade, StudentTask } from '../../services/student.service';

export type NotaRowKind = 'periodo' | 'tarea' | 'examen';
export type NotaFilter = 'all' | 'tarea' | 'examen' | 'periodo';

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
  taskAssignmentId?: string;
  notes?: string | null;
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
  exams = signal<StudentExam[]>([]);
  filter = signal<NotaFilter>('all');

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
      const st = (sub?.status || '').toUpperCase();
      const hasScore = sub?.score != null && Number.isFinite(Number(sub.score));
      const courseName = t.course?.name?.trim() || 'Curso';
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

      push(courseName, {
        id: `t-${t.id}`,
        kind: 'tarea',
        courseName,
        label: t.title,
        dateLabel,
        scoreLabel: hasScore ? String(sub!.score) : '—',
        maxLabel: String(max),
        pctLabel: pct,
        taskId: t.id,
        taskAssignmentId: t.teacherAssignmentId,
        notes: sub?.feedback?.trim() || (st === 'SUBMITTED' || st === 'LATE' ? 'Entregada' : null),
      });
    }

    for (const exam of this.exams()) {
      const courseName = exam.course?.name?.trim() || 'Curso';
      const max = exam.maxScore || 20;
      const hasScore = exam.score != null && Number.isFinite(Number(exam.score));
      const pct =
        hasScore && max > 0
          ? `${Math.round((Number(exam.score) / max) * 1000) / 10}%`
          : '—';
      const d = exam.examDate ? new Date(exam.examDate) : null;
      const dateLabel =
        d && !Number.isNaN(d.getTime())
          ? d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
          : '—';
      const periodBit = exam.period?.name?.trim() ? ` · ${exam.period.name}` : '';
      push(courseName, {
        id: `e-${exam.id}`,
        kind: 'examen',
        courseName,
        label: exam.title,
        dateLabel: `${dateLabel}${periodBit}`,
        scoreLabel: hasScore ? String(exam.score) : '—',
        maxLabel: String(max),
        pctLabel: pct,
        notes: exam.notes?.trim() || null,
      });
    }

    const blocks: NotaCourseBlock[] = [];
    for (const [courseName, rows] of map.entries()) {
      const visible = rows.filter((r) => this.filter() === 'all' || r.kind === this.filter());
      if (!visible.length) continue;
      visible.sort((a, b) => {
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
      for (const r of visible) {
        if (r.scoreLabel !== '—' && Number.isFinite(Number(r.scoreLabel)))
          nums.push(Number(r.scoreLabel));
      }
      let average: string | null = null;
      if (nums.length) {
        const avg = nums.reduce((x, y) => x + y, 0) / nums.length;
        average = String(Math.round(avg * 20) / 20);
      }

      blocks.push({ courseName, rows: visible, average });
    }

    return blocks.sort((a, b) => a.courseName.localeCompare(b.courseName, 'es'));
  });

  totalEvaluations = computed(
    () => this.grades().length + this.tasks().length + this.exams().length,
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
    for (const e of this.exams()) {
      if (e.score != null && Number.isFinite(Number(e.score))) nums.push(Number(e.score));
    }
    if (!nums.length) return null;
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    return String(Math.round(avg * 20) / 20);
  });

  ngOnInit() {
    this.loading.set(true);
    forkJoin({
      grades: this.studentService.getGrades({}).pipe(catchError(() => of([] as StudentGrade[]))),
      tasks: this.studentService.getTasks({}).pipe(catchError(() => of([] as StudentTask[]))),
      exams: this.studentService.getExams().pipe(catchError(() => of([] as StudentExam[]))),
    }).subscribe({
      next: ({ grades, tasks, exams }) => {
        this.grades.set(grades);
        this.tasks.set(tasks);
        this.exams.set(exams);
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

  taskLink(row: NotaRow): string[] {
    if (row.taskAssignmentId && row.taskId) {
      return ['/cursos', row.taskAssignmentId, 'tareas', row.taskId];
    }
    return ['/tareas', row.taskId!];
  }

  kindLabel(kind: NotaRowKind): string {
    if (kind === 'examen') return 'Examen';
    if (kind === 'tarea') return 'Tarea';
    return 'Bimestre';
  }

  isPending(row: NotaRow): boolean {
    return row.scoreLabel === '—';
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
