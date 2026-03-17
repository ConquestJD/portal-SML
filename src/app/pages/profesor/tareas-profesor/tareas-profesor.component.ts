import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TeacherService, TeacherCourse, TeacherTask } from '../../../services/teacher.service';

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
  filterStatus = signal('');
  searchQuery = signal('');
  filter = signal('all');
  courses = signal<TeacherCourse[]>([]);
  tasks = signal<TeacherTask[]>([]);
  loadingTasks = signal(false);

  filteredTasks = computed(() => {
    const f = this.filter();
    if (!f || f === 'all') return this.tasks();
    return this.tasks().filter(t => t.status === f.toUpperCase());
  });

  totalTasks = computed(() => this.tasks().length);
  pendingCount = computed(() => this.tasks().filter(t => t.status === 'DRAFT' || t.status === 'PENDING').length);

  constructor(private teacherService: TeacherService) {}

  ngOnInit() {
    this.teacherService.getCourses().subscribe({
      next: (data) => {
        this.courses.set(data);
        this.loading.set(false);
        if (data.length) {
          this.selectedCourse.set(data[0].id);
          this.loadTasks(data[0].id);
        }
      },
      error: () => { this.error.set('Error al cargar cursos'); this.loading.set(false); }
    });
  }

  onCourseChange(courseId: string) {
    this.selectedCourse.set(courseId);
    this.loadTasks(courseId);
  }

  loadTasks(courseId: string) {
    this.loadingTasks.set(true);
    this.teacherService.getTasks(courseId, {
      status: this.filterStatus() || undefined,
      search: this.searchQuery() || undefined
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

  onSearch() { if (this.selectedCourse()) this.loadTasks(this.selectedCourse()); }
}
