import { Component, signal, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { StudentService, StudentTask } from '../../../services/student.service';
import { pickLocalFiles } from '../../profesor/_utils/pick-local-files';

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
  /** Error al descargar adjuntos (requiere petición autenticada, no window.open). */
  downloadError = signal('');
  showSubmitConfirmation = signal(false);
  fileDragOver = signal(false);
  readonly isLoading = this.loading;

  task = signal<StudentTask | null>(null);
  /** Texto del formulario (ngModel); se sincroniza al cargar la tarea. */
  submissionDraft = '';
  selectedFiles: File[] = [];

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

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

  formatDueShort(d?: string): string {
    if (!d) return '—';
    const x = new Date(d);
    return Number.isNaN(x.getTime())
      ? d
      : x.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  }

  formatDueFull(d?: string): string {
    if (!d) return 'Sin fecha límite';
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return d;
    return x.toLocaleString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  dueDay(d?: string): string {
    if (!d) return '—';
    const x = new Date(d);
    return Number.isNaN(x.getTime()) ? '—' : String(x.getDate());
  }

  dueMonth(d?: string): string {
    if (!d) return '';
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return '';
    return x.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
  }

  dueRelative(): string {
    const raw = this.task()?.dueDate;
    if (!raw) return 'Sin plazo fijado';
    const due = new Date(raw).getTime();
    if (!Number.isFinite(due)) return '';
    const diff = due - Date.now();
    const past = diff < 0;
    const abs = Math.abs(diff);
    const mins = Math.max(1, Math.round(abs / 60000));
    const hours = Math.round(abs / 3600000);
    const days = Math.round(abs / 86400000);
    const unit = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
    let span: string;
    if (mins < 60) span = unit(mins, 'minuto', 'minutos');
    else if (hours < 48) span = unit(hours, 'hora', 'horas');
    else span = unit(days, 'día', 'días');
    return past ? `Venció hace ${span}` : `Vence en ${span}`;
  }

  deliveryTypeLabel(): string {
    const d = this.deliveryType();
    if (d === 'texto') return 'Texto';
    if (d === 'ambos') return 'Archivo y texto';
    if (d === 'clase') return 'En clase';
    return 'Archivo';
  }

  scorePct(): string {
    const t = this.task();
    const sc = t?.submission?.score;
    const max = t?.maxScore ?? 20;
    if (sc == null || !Number.isFinite(Number(sc)) || max <= 0) return '';
    return `${Math.round((Number(sc) / max) * 1000) / 10}%`;
  }

  scoreTone(): 'high' | 'mid' | 'low' | '' {
    const t = this.task();
    const sc = t?.submission?.score;
    const max = t?.maxScore ?? 20;
    if (sc == null || !Number.isFinite(Number(sc)) || max <= 0) return '';
    const pct = (Number(sc) / max) * 100;
    if (pct >= 70) return 'high';
    if (pct >= 55) return 'mid';
    return 'low';
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

  maxSubmissionsCap(): number {
    const t = this.task();
    return Math.max(1, Math.min(20, t?.maxSubmissions ?? 1));
  }

  effectiveSubmitCount(): number {
    const t = this.task();
    if (!t) return 0;
    const s = t.submission;
    if (!s) return 0;
    const c = s.submitCount;
    if (c != null && c > 0) return c;
    return s.submittedAt ? 1 : 0;
  }

  remainingSubmissions(): number {
    return Math.max(0, this.maxSubmissionsCap() - this.effectiveSubmitCount());
  }

  submitAttemptSummary(): string {
    const max = this.maxSubmissionsCap();
    const next = this.effectiveSubmitCount() + 1;
    if (max <= 1) {
      return 'Solo se permite una entrega para esta tarea.';
    }
    if (next >= max) {
      return `Esta será tu entrega ${next} de ${max}. Después de enviar no podrás actualizarla de nuevo.`;
    }
    const left = max - next;
    return `Esta será tu entrega ${next} de ${max}. Tras enviar, aún podrás actualizarla ${left} vez${left !== 1 ? 'es' : ''} más.`;
  }

  canEditSubmission(): boolean {
    const t = this.task();
    if (!t) return false;
    if (this.graded(t)) return false;
    return this.remainingSubmissions() > 0;
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  async browseFiles(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const picked = await pickLocalFiles({ multiple: true, startIn: 'documents' });
    if (picked === 'fallback') {
      this.fileInput?.nativeElement.click();
      return;
    }
    this.addFiles(picked);
  }

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
    this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  private fileKey(f: File): string {
    return `${f.name}:${f.size}:${f.lastModified}`;
  }

  private addFiles(incoming: File[]) {
    if (!incoming.length) return;
    const seen = new Set(this.selectedFiles.map((f) => this.fileKey(f)));
    const next = [...this.selectedFiles];
    for (const f of incoming) {
      const k = this.fileKey(f);
      if (seen.has(k)) continue;
      if (next.length >= 5) break;
      next.push(f);
      seen.add(k);
    }
    this.selectedFiles = next;
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

  requestSubmit() {
    const err = this.validateBeforeSubmit();
    if (err) {
      this.submitError.set(err);
      this.submitSuccess.set('');
      return;
    }
    this.submitError.set('');
    this.showSubmitConfirmation.set(true);
  }

  cancelSubmit() {
    this.showSubmitConfirmation.set(false);
  }

  confirmSubmit() {
    this.showSubmitConfirmation.set(false);
    this.executeSubmit();
  }

  private executeSubmit() {
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
    this.downloadError.set('');
    const fallback =
      this.task()?.attachments?.find((a) => a.id === fileId)?.name ?? 'archivo';

    this.studentService.downloadTaskMaterialBlob(this.taskId(), fileId).subscribe({
      next: async (res) => {
        const apiErr = await this.messageIfBlobIsApiError(res.blob);
        if (apiErr) {
          this.downloadError.set(apiErr);
          return;
        }
        this.triggerBlobDownload(res.blob, res.filename ?? fallback);
      },
      error: (err: unknown) => {
        void this.downloadHttpFailureMessage(err).then((m) => this.downloadError.set(m));
      },
    });
  }

  downloadSubmissionFile(fileId: string) {
    this.downloadError.set('');
    const fallback =
      this.task()?.submission?.attachments?.find((a) => a.id === fileId)?.name ?? 'archivo';

    this.studentService.downloadSubmissionAttachmentBlob(this.taskId(), fileId).subscribe({
      next: async (res) => {
        const apiErr = await this.messageIfBlobIsApiError(res.blob);
        if (apiErr) {
          this.downloadError.set(apiErr);
          return;
        }
        this.triggerBlobDownload(res.blob, res.filename ?? fallback);
      },
      error: (err: unknown) => {
        void this.downloadHttpFailureMessage(err).then((m) => this.downloadError.set(m));
      },
    });
  }

  private triggerBlobDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.trim() || 'descarga';
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Si el servidor devolvió JSON de error en el cuerpo (p. ej. tipo application/json). */
  private async messageIfBlobIsApiError(blob: Blob): Promise<string | null> {
    if (blob.type && blob.type !== 'application/json' && !blob.type.includes('json')) {
      return null;
    }
    if (blob.size > 8192) return null;
    const text = await blob.text();
    if (!text.trimStart().startsWith('{')) return null;
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      if (j?.error?.message?.trim()) return j.error.message.trim();
    } catch {
      return null;
    }
    return null;
  }

  private async downloadHttpFailureMessage(err: unknown): Promise<string> {
    const e = err as HttpErrorResponse;
    if (e?.error instanceof Blob) {
      try {
        const t = await e.error.text();
        const j = JSON.parse(t) as { error?: { message?: string } };
        if (j?.error?.message) return j.error.message;
      } catch {
        /* ignore */
      }
    }
    return 'No se pudo descargar el archivo. Si la sesión expiró, vuelve a iniciar sesión.';
  }

  submissionIsGraded(): boolean {
    const s = this.task()?.submission;
    return (s?.status || '').toUpperCase() === 'GRADED';
  }
}
