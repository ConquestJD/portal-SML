import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TeacherService, TeacherCourse, TeacherTask } from '../../../services/teacher.service';

/** Fila en la lista global de tareas (incluye contexto de asignación docente). */
export interface TeacherTaskRow extends TeacherTask {
  assignmentId: string;
  courseLabel: string;
  submitted: number;
  totalStudents: number;
  pendingToGrade: number;
}

@Component({
  selector: 'app-tareas-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tareas-profesor.component.html',
  styleUrl: './tareas-profesor.component.css'
})
export class TareasProfesorComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedCourse = signal('');
  searchQuery = signal('');
  filter = signal<'todas' | 'cerrada'>('todas');
  courses = signal<TeacherCourse[]>([]);
  tasks = signal<TeacherTask[]>([]);
  rosterCount = signal(0);
  loadingTasks = signal(false);

  tasksRow = computed(() => this.mapTasksForList(this.tasks()));

  filteredTasks = computed(() => {
    const rows = this.tasksRow();
    const f = this.filter();
    if (f === 'todas') return rows;
    if (f === 'cerrada') {
      return rows.filter(t => this.isClosedTask(t));
    }
    return rows;
  });

  totalTasks = computed(() => this.tasks().length);
  pendingCount = computed(() =>
    this.tasksRow().reduce((acc, t) => acc + (t.pendingToGrade > 0 ? t.pendingToGrade : 0), 0)
  );

  constructor(
    private teacherService: TeacherService,
    private router: Router
  ) {}

  ngOnInit() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.router.url.startsWith('/profesor/tareas') && this.selectedCourse()) {
          this.loadTasks(this.selectedCourse());
        }
      });

    this.teacherService.getCourses().subscribe({
      next: (data) => {
        this.courses.set(data);
        this.loading.set(false);
        if (data.length) {
          this.selectedCourse.set(data[0].id);
          this.loadRosterAndTasks(data[0]);
        }
      },
      error: () => { this.error.set('Error al cargar cursos'); this.loading.set(false); }
    });
  }

  onCourseChange(courseId: string) {
    this.selectedCourse.set(courseId);
    const c = this.courses().find(x => x.id === courseId);
    if (c) this.loadRosterAndTasks(c);
    else this.loadTasks(courseId);
  }

  private loadRosterAndTasks(c: TeacherCourse) {
    this.teacherService.getRosterCountForCourse(c).subscribe({
      next: (n) => this.rosterCount.set(n),
      error: () => this.rosterCount.set(0)
    });
    this.loadTasks(c.id);
  }

  loadTasks(courseId: string) {
    this.loadingTasks.set(true);
    this.teacherService.getTasks(courseId, {
      search: this.searchQuery().trim() || undefined
    }).subscribe({
      next: (data) => { this.tasks.set(data); this.loadingTasks.set(false); },
      error: () => this.loadingTasks.set(false)
    });
  }

  deleteTask(taskId: string) {
    if (!confirm('¿Eliminar tarea?')) return;
    this.teacherService.deleteTask(this.selectedCourse(), taskId).subscribe({
      next: () => this.loadTasks(this.selectedCourse())
    });
  }

  getSelectedCourseName(): string {
    return this.courses().find(c => c.id === this.selectedCourse())?.course.name ?? '';
  }

  courseOptionLabel(c: TeacherCourse): string {
    const g = [c.course?.grade, c.course?.level].filter(Boolean).join(' · ');
    return g ? `${c.course.name} (${g})` : c.course.name;
  }

  onSearch() {
    if (this.selectedCourse()) this.loadTasks(this.selectedCourse());
  }

  setSearch(value: string) {
    this.searchQuery.set(value);
    this.onSearch();
  }

  mapTasksForList(raw: TeacherTask[]): TeacherTaskRow[] {
    const aid = this.selectedCourse();
    const courseLabel = this.getSelectedCourseName();
    const total = this.rosterCount();
    return raw.map(t => {
      const submitted =
        t.submissionsCount ?? t.submitted ?? 0;
      const graded = t.gradedCount ?? 0;
      const pendingToGrade =
        typeof t.pending === 'number' && t.submissionsCount === undefined && t.gradedCount === undefined
          ? t.pending
          : Math.max(0, submitted - graded);
      return {
        ...t,
        assignmentId: aid,
        courseLabel,
        submitted,
        totalStudents: total,
        pendingToGrade
      };
    });
  }

  private isClosedTask(t: TeacherTask): boolean {
    const s = (t.status || '').toUpperCase();
    if (s === 'CLOSED' || s === 'ARCHIVED' || s === 'ENDED') return true;
    if (!t.dueDate) return false;
    const end = new Date(t.dueDate).getTime();
    return Number.isFinite(end) && end < Date.now();
  }

  statusLabel(t: TeacherTaskRow): string {
    if (this.isClosedTask(t)) {
      const s = (t.status || '').toUpperCase();
      if (s === 'CLOSED' || s === 'ARCHIVED' || s === 'ENDED') return 'Cerrada';
      return 'Vencida';
    }
    return 'Activa';
  }

  badgeClass(t: TeacherTaskRow): string {
    if (this.isClosedTask(t)) return 'badge-warning';
    return 'badge-info';
  }

  formatDueDate(d?: string): string {
    if (!d) return '—';
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return d;
    return x.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
}
