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
  deliveryType = signal('archivo');
  title = signal('');
  instructions = signal('');
  dueDate = signal('');
  points = signal(20);
  /** Cuántas veces el alumno puede enviar o actualizar su entrega (1–20). */
  maxSubmissions = signal(1);

  backLabel = signal('Volver a tareas');
  courseLabel = signal('');
  returnToList = signal(false);

  canSave = computed(() => {
    const t = this.title().trim();
    const i = this.instructions().trim();
    const d = this.dueDate().trim();
    return !!t && !!i && !!d;
  });

  pageTitle = computed(() => this.isEditMode() ? 'Editar tarea' : 'Nueva tarea');

  saveTask() { this.onSubmit(); }

  cancel() {
    if (this.returnToList()) {
      void this.router.navigate(['/profesor/tareas']);
    } else {
      void this.router.navigate(['/profesor/cursos', this.courseId()], { queryParams: { tab: 'tareas' } });
    }
  }

  ngOnInit() {
    const fromList = this.route.snapshot.queryParamMap.get('returnTo') === 'tareas';
    this.returnToList.set(fromList);
    this.backLabel.set(fromList ? '← Tareas' : '← Tareas del curso');

    const cId = this.route.snapshot.paramMap.get('courseId') ?? '';
    const tId = this.route.snapshot.paramMap.get('taskId') ?? '';
    this.courseId.set(cId);

    if (cId) {
      this.teacherService.getCourse(cId).subscribe({
        next: (c) => {
          const name = c.course?.name ?? '';
          const grade = (c.course?.grade ?? '').trim();
          const level = (c.course?.level ?? '').trim();
          this.courseLabel.set([name, [grade, level].filter(Boolean).join(' · ')].filter(Boolean).join(' · '));
        },
      });
    }

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
        const ms = Number(data.maxSubmissions);
        this.maxSubmissions.set(
          Number.isFinite(ms) ? Math.max(1, Math.min(20, Math.floor(ms))) : 1,
        );
        const dt = data.deliveryType ?? 'archivo';
        this.deliveryType.set(['archivo', 'texto', 'ambos', 'clase'].includes(dt) ? dt : 'archivo');
      },
      error: (err) => {
        this.error.set(this.extractHttpError(err));
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

  onMaxSubmissionsInput(raw: string | number) {
    const n = Math.floor(Number(raw));
    this.maxSubmissions.set(Number.isFinite(n) ? Math.max(1, Math.min(20, n)) : 1);
  }

  removeFile(file: File) {
    const k = this.fileKey(file);
    this.selectedFiles.set(this.selectedFiles().filter(f => this.fileKey(f) !== k));
  }

  private afterSaveNavigate() {
    if (this.returnToList()) {
      void this.router.navigate(['/profesor/tareas']);
    } else {
      void this.router.navigate(['/profesor/cursos', this.courseId()], { queryParams: { tab: 'tareas' } });
    }
  }

  private extractHttpError(err: unknown): string {
    const e = err as {
      error?: { message?: string | string[]; error?: { message?: string } };
      message?: string;
    };
    const nested = e?.error?.error?.message;
    const raw =
      (typeof nested === 'string' && nested.trim() ? nested : '') ||
      (Array.isArray(e?.error?.message) ? e.error!.message!.filter(Boolean).join('. ') : '') ||
      (typeof e?.error?.message === 'string' ? e.error.message : '') ||
      (typeof e?.message === 'string' ? e.message : '');
    const msg = raw.trim();
    if (!msg) return 'Error al guardar la tarea';
    if (/^[a-f0-9]{32,64}$/i.test(msg)) {
      return 'No se pudo crear la tarea con los archivos enviados. Prueba con menos archivos, tamaño menor o sin adjuntos para aislar el fallo. Si el problema continúa, puede ser un error del almacenamiento en el servidor.';
    }
    return msg;
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
        maxSubmissions: this.maxSubmissions(),
        deliveryType: this.deliveryType(),
      }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.afterSaveNavigate();
        },
        error: (err) => {
          this.error.set(this.extractHttpError(err));
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
      fd.append('maxSubmissions', String(this.maxSubmissions()));
      fd.append('deliveryType', this.deliveryType());
      this.selectedFiles().forEach(f => fd.append('files', f));

      this.teacherService.createTask(this.courseId(), fd).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.afterSaveNavigate();
        },
        error: (err) => {
          this.error.set(this.extractHttpError(err));
          this.isSaving.set(false);
        }
      });
    }
  }
}
