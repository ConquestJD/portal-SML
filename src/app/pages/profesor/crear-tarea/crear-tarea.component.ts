import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { TeacherService } from '../../../services/teacher.service';

@Component({
  selector: 'app-crear-tarea',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './crear-tarea.component.html',
  styleUrl: './crear-tarea.component.css'
})
export class CrearTareaComponent implements OnInit {
  courseId = signal('');
  taskId = signal('');
  isEditMode = signal(false);
  isLoading = signal(false);
  isSaving = signal(false);
  error = signal('');
  success = signal('');
  selectedFiles = signal<File[]>([]);
  showAdvanced = signal(false);
  deliveryType = signal('FILE');
  title = signal('');
  instructions = signal('');
  dueDate = signal('');
  points = signal(20);
  status = signal('DRAFT');

  attachments = computed(() => this.selectedFiles());
  canSave = computed(() => !!this.title());

  saveTask() { this.onSubmit(); }
  cancel() { history.back(); }
  toggleAdvanced() { this.showAdvanced.update(v => !v); }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teacherService: TeacherService
  ) {}

  ngOnInit() {
    const cId = this.route.snapshot.paramMap.get('courseId') ?? '';
    const tId = this.route.snapshot.paramMap.get('taskId') ?? '';
    this.courseId.set(cId);

    if (tId && tId !== 'nueva') {
      this.taskId.set(tId);
      this.isEditMode.set(true);
      this.loadTask(tId);
    }
  }

  loadTask(taskId: string) {
    this.teacherService.getTask(this.courseId(), taskId).subscribe({
      next: (data) => {
        this.title.set(data.title);
        this.instructions.set(data.description ?? '');
        this.dueDate.set(data.dueDate ? data.dueDate.split('T')[0] : '');
        this.points.set(data.maxScore);
        this.status.set(data.status);
      }
    });
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFiles.set(Array.from(input.files ?? []));
  }
  onFileSelected(event: Event) { this.onFilesSelected(event); }

  onSubmit() {
    this.isLoading.set(true);
    this.error.set('');

    if (this.isEditMode()) {
      this.teacherService.updateTask(this.courseId(), this.taskId(), {
        title: this.title(), description: this.instructions(),
        dueDate: this.dueDate() || undefined,
        maxScore: this.points(), status: this.status()
      }).subscribe({
        next: () => {
          this.success.set('Tarea actualizada');
          this.isLoading.set(false);
          this.router.navigate([`/profesor/cursos/${this.courseId()}`]);
        },
        error: (err) => { this.error.set(err?.error?.error?.message ?? 'Error al actualizar'); this.isLoading.set(false); }
      });
    } else {
      const fd = new FormData();
      fd.append('title', this.title());
      if (this.instructions()) fd.append('description', this.instructions());
      if (this.dueDate()) fd.append('dueDate', this.dueDate());
      fd.append('maxScore', String(this.points()));
      fd.append('status', this.status());
      this.selectedFiles().forEach(f => fd.append('files', f));

      this.teacherService.createTask(this.courseId(), fd).subscribe({
        next: () => {
          this.success.set('Tarea creada');
          this.isLoading.set(false);
          this.router.navigate([`/profesor/cursos/${this.courseId()}`]);
        },
        error: (err) => { this.error.set(err?.error?.error?.message ?? 'Error al crear'); this.isLoading.set(false); }
      });
    }
  }
}
