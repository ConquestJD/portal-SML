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
  dueTime = signal('23:59');
  points = signal(20);
  /** Cuántas veces el alumno puede enviar o actualizar su entrega (1–20). */
  maxSubmissions = signal(1);
  fileDragOver = signal(false);

  backLabel = signal('← Tareas del curso');
  courseLabel = signal('');

  canSave = computed(() => {
    const t = this.title().trim();
    const i = this.instructions().trim();
    const d = this.dueDate().trim();
    return !!t && !!i && !!d;
  });

  pageTitle = computed(() => this.isEditMode() ? 'Editar tarea' : 'Nueva tarea');

  saveTask() { this.onSubmit(); }

  cancel() {
    void this.router.navigate(['/profesor/cursos', this.courseId()], { queryParams: { tab: 'tareas' } });
  }

  ngOnInit() {
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
        const due = data.dueDate ? this.splitDue(data.dueDate) : { date: '', time: '23:59' };
        this.dueDate.set(due.date);
        this.dueTime.set(due.time);
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

  /** Día y hora locales del plazo. Si no hay hora, 23:59. */
  private splitDue(iso: string): { date: string; time: string } {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      const day = (iso.split('T')[0] ?? '').slice(0, 10);
      return { date: day, time: '23:59' };
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  }

  onDueDateChange(value: string) {
    this.dueDate.set(value);
    if (value && !this.dueTime()) this.dueTime.set('23:59');
  }

  private dueDateToIso(): string | undefined {
    const day = this.dueDate().trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined;
    const time = /^\d{2}:\d{2}$/.test(this.dueTime().trim()) ? this.dueTime().trim() : '23:59';
    const d = new Date(`${day}T${time}:00`);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
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
    this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  onFileSelected(event: Event) { this.onFilesSelected(event); }

  onFileDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.fileDragOver.set(true);
  }

  onFileDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const zone = event.currentTarget as HTMLElement;
    const next = event.relatedTarget as Node | null;
    if (next && zone.contains(next)) return;
    this.fileDragOver.set(false);
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.fileDragOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    this.addFiles(files);
  }

  private addFiles(incoming: File[]) {
    const allowed = this.filterAcceptedFiles(incoming);
    if (!allowed.length) return;
    const current = this.selectedFiles();
    const seen = new Set(current.map(f => this.fileKey(f)));
    const next = [...current];
    for (const f of allowed) {
      const k = this.fileKey(f);
      if (seen.has(k)) continue;
      seen.add(k);
      next.push(f);
      if (next.length >= 5) break;
    }
    this.selectedFiles.set(next.slice(0, 5));
  }

  private filterAcceptedFiles(files: File[]): File[] {
    const ok = /\.(pdf|docx?|pptx?|jpe?g|png)$/i;
    return files.filter(f => ok.test(f.name));
  }

  onMaxSubmissionsInput(raw: string | number) {
    const n = Math.floor(Number(raw));
    this.maxSubmissions.set(Number.isFinite(n) ? Math.max(1, Math.min(20, n)) : 1);
  }

  removeFile(file: File) {
    const k = this.fileKey(file);
    this.selectedFiles.set(this.selectedFiles().filter(f => this.fileKey(f) !== k));
  }

  private afterSaveNavigate() {
    void this.router.navigate(['/profesor/cursos', this.courseId()], { queryParams: { tab: 'tareas' } });
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
      this.teacherService.updateTask(this.courseId(), this.taskId(), {
        title: this.title().trim(),
        description: this.instructions().trim(),
        dueDate: this.dueDateToIso(),
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
      const dueIso = this.dueDateToIso();
      if (dueIso) fd.append('dueDate', dueIso);
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
