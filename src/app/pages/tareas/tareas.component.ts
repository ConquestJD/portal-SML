import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentService, StudentTask } from '../../services/student.service';

export type TaskUiStatus = 'pendiente' | 'vencida' | 'en-revision' | 'calificada';

@Component({
  selector: 'app-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tareas.component.html',
  styleUrl: './tareas.component.css'
})
export class TareasComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  searchQuery = signal('');
  /** chips: todas | pendientes | entregadas | vencidas */
  filter = signal<'todas' | 'pendientes' | 'entregadas' | 'vencidas'>('todas');
  tasks = signal<StudentTask[]>([]);

  constructor(private studentService: StudentService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.studentService.getTasks({}).subscribe({
      next: (data) => {
        this.tasks.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar tareas');
        this.loading.set(false);
      },
    });
  }

  private submitted(task: StudentTask): boolean {
    const s = task.submission;
    if (!s) return false;
    const st = (s.status || '').toUpperCase();
    return st === 'SUBMITTED' || st === 'GRADED' || st === 'LATE' || !!s.submittedAt;
  }

  private isOverdue(task: StudentTask): boolean {
    if (!task.dueDate) return false;
    const t = new Date(task.dueDate).getTime();
    return Number.isFinite(t) && t < Date.now();
  }

  private graded(task: StudentTask): boolean {
    const s = task.submission;
    if (!s) return false;
    if ((s.status || '').toUpperCase() === 'GRADED') return true;
    return s.score != null && Number.isFinite(Number(s.score));
  }

  taskUiStatus(task: StudentTask): TaskUiStatus {
    if (this.graded(task)) return 'calificada';
    if (this.submitted(task)) return 'en-revision';
    if (this.isOverdue(task)) return 'vencida';
    return 'pendiente';
  }

  taskUiStatusLabel(task: StudentTask): string {
    const u = this.taskUiStatus(task);
    if (u === 'calificada') return 'Calificada';
    if (u === 'en-revision') return 'Entregada';
    if (u === 'vencida') return 'Vencida';
    return 'Pendiente';
  }

  courseName(task: StudentTask): string {
    return task.course?.name?.trim() || 'Curso';
  }

  formatDue(d?: string): string {
    if (!d) return '—';
    const x = new Date(d);
    return Number.isNaN(x.getTime()) ? d : x.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
  }

  pendingCount = computed(() =>
    this.tasks().filter((t) => !this.submitted(t) && !this.isOverdue(t)).length,
  );

  overdueCount = computed(() =>
    this.tasks().filter((t) => !this.submitted(t) && this.isOverdue(t)).length,
  );

  completedCount = computed(() => this.tasks().filter((t) => this.submitted(t)).length);

  filteredTasks = computed(() => {
    let list = this.tasks();
    const f = this.filter();
    if (f === 'pendientes') {
      list = list.filter((t) => !this.submitted(t) && !this.isOverdue(t));
    } else if (f === 'entregadas') {
      list = list.filter((t) => this.submitted(t));
    } else if (f === 'vencidas') {
      list = list.filter((t) => !this.submitted(t) && this.isOverdue(t));
    }

    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        this.courseName(t).toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q),
    );
  });

  setFilter(f: 'todas' | 'pendientes' | 'entregadas' | 'vencidas') {
    this.filter.set(f);
  }
}
