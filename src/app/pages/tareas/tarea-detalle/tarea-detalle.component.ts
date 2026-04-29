import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StudentService, StudentTask } from '../../../services/student.service';

type TaskUiStatus = 'pendiente' | 'vencida' | 'en-revision' | 'calificada';

@Component({
  selector: 'app-tarea-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tarea-detalle.component.html',
  styleUrl: './tarea-detalle.component.css',
})
export class TareaDetalleComponent implements OnInit {
  taskId = signal('');
  loading = signal(true);
  error = signal('');
  submitting = signal(false);
  submitSuccess = signal('');
  submitError = signal('');
  readonly isLoading = this.loading;

  task = signal<StudentTask | null>(null);
  /** Texto del formulario (ngModel); se sincroniza al cargar la tarea. */
  submissionDraft = '';
  selectedFiles: File[] = [];

  constructor(
    private route: ActivatedRoute,
    private studentService: StudentService,
    private location: Location,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.taskId.set(id);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.studentService.getTask(this.taskId()).subscribe({
      next: (data) => {
        this.task.set(data);
        this.submissionDraft =
          data.submission?.content != null && String(data.submission.content).trim()
            ? String(data.submission.content)
            : '';
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la tarea.');
        this.loading.set(false);
      },
    });
  }

  goBack() {
    this.location.back();
  }

  formatDue(d?: string): string {
    if (!d) return '—';
    const x = new Date(d);
    return Number.isNaN(x.getTime()) ? d : x.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
  }

  private submitted(t: StudentTask): boolean {
    const s = t.submission;
    if (!s) return false;
    const st = (s.status || '').toUpperCase();
    return st === 'SUBMITTED' || st === 'GRADED' || st === 'LATE' || !!s.submittedAt;
  }

  private isOverdue(t: StudentTask): boolean {
    if (!t.dueDate) return false;
    const x = new Date(t.dueDate).getTime();
    return Number.isFinite(x) && x < Date.now();
  }

  private graded(t: StudentTask): boolean {
    const s = t.submission;
    if (!s) return false;
    if ((s.status || '').toUpperCase() === 'GRADED') return true;
    return s.score != null && Number.isFinite(Number(s.score));
  }

  taskUiStatus(): TaskUiStatus {
    const t = this.task();
    if (!t) return 'pendiente';
    if (this.graded(t)) return 'calificada';
    if (this.submitted(t)) return 'en-revision';
    if (this.isOverdue(t)) return 'vencida';
    return 'pendiente';
  }

  taskUiStatusLabel(): string {
    const u = this.taskUiStatus();
    if (u === 'calificada') return 'Calificada';
    if (u === 'en-revision') return 'Entregada';
    if (u === 'vencida') return 'Vencida';
    return 'Pendiente';
  }

  deliveryType(): 'archivo' | 'texto' | 'ambos' | 'clase' {
    const d = (this.task()?.deliveryType ?? 'archivo') as string;
    if (d === 'texto' || d === 'ambos' || d === 'clase') return d;
    return 'archivo';
  }

  deliveryHint(): string {
    const m: Record<string, string> = {
      archivo: 'Debes adjuntar al menos un archivo.',
      texto: 'Escribe tu respuesta en el cuadro de texto.',
      ambos: 'Debes escribir tu respuesta y adjuntar al menos un archivo.',
      clase:
        'La calificación principal es en clase. Si quieres dejar algo en el portal, escribe un comentario o adjunta un archivo.',
    };
    return m[this.deliveryType()] ?? m['archivo'];
  }

  showTextField(): boolean {
    const d = this.deliveryType();
    return d === 'texto' || d === 'ambos' || d === 'clase';
  }

  showFileField(): boolean {
    const d = this.deliveryType();
    return d === 'archivo' || d === 'ambos' || d === 'clase';
  }

  canEditSubmission(): boolean {
    const t = this.task();
    if (!t) return false;
    if (this.graded(t)) return false;
    return true;
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const added = Array.from(input.files ?? []);
    this.selectedFiles = [...this.selectedFiles, ...added].slice(0, 5);
    input.value = '';
  }

  removeFile(i: number) {
    this.selectedFiles = this.selectedFiles.filter((_, j) => j !== i);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private validateBeforeSubmit(): string | null {
    const d = this.deliveryType();
    const text = this.submissionDraft.trim();
    const n = this.selectedFiles.length;
    if (d === 'texto' && !text) return 'Escribe tu respuesta.';
    if (d === 'archivo' && n === 0) return 'Adjunta al menos un archivo.';
    if (d === 'ambos' && (!text || n === 0)) return 'Debes escribir la respuesta y adjuntar al menos un archivo.';
    if (d === 'clase' && !text && n === 0)
      return 'Escribe un comentario o adjunta un archivo para registrar algo en el portal.';
    return null;
  }

  private submitErrorMessage(err: unknown): string {
    const e = err as {
      error?: { message?: string | string[]; error?: { message?: string } };
    };
    const msg = e?.error?.message;
    if (Array.isArray(msg)) return msg[0] ?? 'Error al entregar.';
    if (typeof msg === 'string') return msg;
    const nested = e?.error?.error?.message;
    if (typeof nested === 'string') return nested;
    return 'Error al entregar la tarea.';
  }

  submit() {
    const err = this.validateBeforeSubmit();
    if (err) {
      this.submitError.set(err);
      this.submitSuccess.set('');
      return;
    }
    this.submitting.set(true);
    this.submitError.set('');
    this.submitSuccess.set('');

    const fd = new FormData();
    const text = this.submissionDraft.trim();
    if (text) fd.append('content', text);
    this.selectedFiles.forEach((f) => fd.append('files', f));

    this.studentService.submitTask(this.taskId(), fd).subscribe({
      next: () => {
        this.submitSuccess.set('Entrega registrada correctamente.');
        this.submitting.set(false);
        this.selectedFiles = [];
        this.studentService.getTask(this.taskId()).subscribe({
          next: (data) => {
            this.task.set(data);
            this.submissionDraft =
              data.submission?.content != null && String(data.submission.content).trim()
                ? String(data.submission.content)
                : '';
          },
        });
      },
      error: (e) => {
        this.submitError.set(this.submitErrorMessage(e));
        this.submitting.set(false);
      },
    });
  }

  downloadMaterial(fileId: string) {
    window.open(this.studentService.getTaskMaterialDownloadUrl(this.taskId(), fileId));
  }

  downloadSubmissionFile(fileId: string) {
    window.open(this.studentService.getSubmissionAttachmentDownloadUrl(this.taskId(), fileId));
  }

  submissionIsGraded(): boolean {
    const s = this.task()?.submission;
    return (s?.status || '').toUpperCase() === 'GRADED';
  }
}
