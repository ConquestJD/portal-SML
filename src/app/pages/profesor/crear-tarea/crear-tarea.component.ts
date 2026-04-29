import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TeacherService } from '../../../services/teacher.service';

@Component({
  selector: 'app-crear-tarea',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-tarea.component.html',
  styleUrl: './crear-tarea.component.css'
})
export class CrearTareaComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teacherService = inject(TeacherService);

  courseId = signal('');
  taskId = signal('');
  isEditMode = signal(false);
  isSaving = signal(false);
  error = signal('');
  success = signal('');
  selectedFiles = signal<File[]>([]);
  showAdvanced = signal(false);
  deliveryType = signal('archivo');
  title = signal('');
  instructions = signal('');
  dueDate = signal('');
  points = signal(20);
  status = signal('DRAFT');

  backLabel = signal('Volver al curso');

  canSave = computed(() => {
    const t = this.title().trim();
    const i = this.instructions().trim();
    const d = this.dueDate().trim();
    return !!t && !!i && !!d;
  });

  saveTask() { this.onSubmit(); }

  cancel() {
    if (this.route.snapshot.queryParamMap.get('returnTo') === 'tareas') {
      void this.router.navigate(['/profesor/tareas']);
    } else {
      history.back();
    }
  }

  toggleAdvanced() { this.showAdvanced.update(v => !v); }

  ngOnInit() {
    if (this.route.snapshot.queryParamMap.get('returnTo') === 'tareas') {
      this.backLabel.set('Volver a tareas');
    }

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
        this.dueDate.set(data.dueDate ? this.toDatetimeLocalValue(data.dueDate) : '');
        this.points.set(data.maxScore);
        this.status.set(data.status);
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'No se pudo cargar la tarea');
      }
    });
  }

  /** Convierte ISO u otros formatos del API a valor `datetime-local`. */
  private toDatetimeLocalValue(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.split('T')[0] ?? '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  fileKey(f: File): string {
    return `${f.name}-${f.size}-${f.lastModified}`;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const added = Array.from(input.files ?? []);
    const merged = [...this.selectedFiles(), ...added].slice(0, 5);
    this.selectedFiles.set(merged);
    input.value = '';
  }

  onFileSelected(event: Event) { this.onFilesSelected(event); }

  removeFile(file: File) {
    const k = this.fileKey(file);
    this.selectedFiles.set(this.selectedFiles().filter(f => this.fileKey(f) !== k));
  }

  private afterSaveNavigate() {
    if (this.route.snapshot.queryParamMap.get('returnTo') === 'tareas') {
      void this.router.navigate(['/profesor/tareas']);
    } else {
      void this.router.navigate(['/profesor/cursos', this.courseId()]);
    }
  }

  onSubmit() {
    if (!this.canSave()) return;
    this.isSaving.set(true);
    this.error.set('');
    this.success.set('');

    if (this.isEditMode()) {
      const dueRaw = this.dueDate().trim();
      this.teacherService.updateTask(this.courseId(), this.taskId(), {
        title: this.title().trim(),
        description: this.instructions().trim(),
        dueDate: dueRaw ? new Date(dueRaw).toISOString() : undefined,
        maxScore: this.points(),
        status: this.status()
      }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.afterSaveNavigate();
        },
        error: (err) => {
          this.error.set(err?.error?.error?.message ?? 'Error al actualizar');
          this.isSaving.set(false);
        }
      });
    } else {
      const fd = new FormData();
      fd.append('title', this.title().trim());
      fd.append('description', this.instructions().trim());
      const dueRaw = this.dueDate().trim();
      if (dueRaw) fd.append('dueDate', new Date(dueRaw).toISOString());
      fd.append('maxScore', String(this.points()));
      fd.append('status', this.status());
      this.selectedFiles().forEach(f => fd.append('files', f));

      this.teacherService.createTask(this.courseId(), fd).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.afterSaveNavigate();
        },
        error: (err) => {
          this.error.set(err?.error?.error?.message ?? 'Error al crear');
          this.isSaving.set(false);
        }
      });
    }
  }
}
