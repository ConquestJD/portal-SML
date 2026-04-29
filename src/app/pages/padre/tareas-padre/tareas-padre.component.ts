import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ParentService, Child } from '../../../services/parent.service';

/** Fila para la plantilla (API devuelve Prisma task + childSubmission). */
export interface ParentTaskRow {
  id: string;
  title: string;
  course: string;
  dueDate: string | Date | null;
  status: 'pendiente' | 'entregada' | 'vencida';
  submitted: boolean;
  submittedDate: string | Date | null;
  grade: number | null;
}

@Component({
  selector: 'app-tareas-padre',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tareas-padre.component.html',
  styleUrl: './tareas-padre.component.css',
})
export class TareasPadreComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedChildId = signal('');
  /** todos | pendiente | entregada | vencida */
  filterStatus = signal<'todos' | 'pendiente' | 'entregada' | 'vencida'>('todos');
  searchQuery = signal('');
  children = signal<Child[]>([]);
  tasks = signal<unknown[]>([]);

  selectedChild = computed(() => this.children().find((c) => c.id === this.selectedChildId()) ?? null);

  readonly isLoading = this.loading;

  /** Tareas mapeadas + búsqueda + filtro de pestaña */
  filteredTasks = computed(() => {
    const raw = this.tasks() as Record<string, unknown>[];
    let rows = raw.map((t) => this.mapApiTask(t));
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => r.title.toLowerCase().includes(q) || r.course.toLowerCase().includes(q));
    }
    const f = this.filterStatus();
    if (f === 'pendiente') rows = rows.filter((r) => r.status === 'pendiente');
    else if (f === 'entregada') rows = rows.filter((r) => r.status === 'entregada');
    else if (f === 'vencida') rows = rows.filter((r) => r.status === 'vencida');
    return rows;
  });

  taskSummary = computed(() => {
    const rows = (this.tasks() as Record<string, unknown>[]).map((t) => this.mapApiTask(t));
    return {
      pendiente: rows.filter((r) => r.status === 'pendiente').length,
      entregada: rows.filter((r) => r.status === 'entregada').length,
      vencida: rows.filter((r) => r.status === 'vencida').length,
    };
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
        this.loadTasks(initial);
      },
      error: () => {
        this.error.set('Error al cargar hijos');
        this.loading.set(false);
      },
    });
  }

  selectChild(id: string) {
    this.selectedChildId.set(id);
    this.loadTasks(id);
  }

  setFilter(f: 'todos' | 'pendiente' | 'entregada' | 'vencida') {
    this.filterStatus.set(f);
  }

  loadTasks(childId: string) {
    this.loading.set(true);
    this.error.set('');
    this.parentService.getChildTasks(childId, {}).subscribe({
      next: (data) => {
        this.tasks.set(Array.isArray(data) ? data : []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar las tareas');
        this.tasks.set([]);
        this.loading.set(false);
      },
    });
  }

  getChildName(c: Child): string {
    return `${c.user.firstName} ${c.user.lastName}`;
  }

  private mapApiTask(t: Record<string, unknown>): ParentTaskRow {
    const ta = t['teacherAssignment'] as Record<string, unknown> | undefined;
    const courseObj = ta?.['course'] as Record<string, unknown> | undefined;
    const course = (courseObj?.['name'] as string) ?? '—';
    const sub = t['childSubmission'] as Record<string, unknown> | null | undefined;
    const hasSubmission = sub != null;
    const grade = typeof sub?.['score'] === 'number' ? (sub['score'] as number) : null;

    let status: ParentTaskRow['status'];
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
      course,
      dueDate: (t['dueDate'] as string | Date | null) ?? null,
      status,
      submitted: hasSubmission,
      submittedDate,
      grade,
    };
  }
}
