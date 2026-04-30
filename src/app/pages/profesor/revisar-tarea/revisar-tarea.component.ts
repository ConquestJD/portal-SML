import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TeacherService, TeacherTask, TaskSubmission } from '../../../services/teacher.service';

type FilterChip = 'todas' | 'pendiente' | 'entregada' | 'calificada';

@Component({
  selector: 'app-revisar-tarea',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './revisar-tarea.component.html',
  styleUrl: './revisar-tarea.component.css'
})
export class RevisarTareaComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teacherService = inject(TeacherService);

  courseId = signal('');
  taskId = signal('');
  loading = signal(true);
  error = signal('');
  filterChip = signal<FilterChip>('todas');
  searchQuery = signal('');

  task = signal<TeacherTask | null>(null);
  submissions = signal<TaskSubmission[]>([]);
  selectedSubmission = signal<TaskSubmission | null>(null);

  gradeForm = signal({ score: 0, feedback: '' });
  saving = signal(false);
  showGradingModal = signal(false);
  /** Error al descargar adjuntos de entregas (requiere petición autenticada). */
  downloadError = signal('');

  readonly isLoading = this.loading;

  filteredSubmissions = computed(() => {
    let list = this.submissions();
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(s => {
        const u = s.student.user;
        const name = `${u.firstName} ${u.lastName}`.toLowerCase();
        return name.includes(q) || (s.student.studentCode ?? '').toLowerCase().includes(q);
      });
    }
    const f = this.filterChip();
    if (f === 'todas') return list;
    if (f === 'calificada') return list.filter(s => s.status === 'GRADED');
    if (f === 'pendiente') {
      return list.filter(s => s.status !== 'GRADED' && !s.submittedAt);
    }
    if (f === 'entregada') {
      return list.filter(s => !!s.submittedAt && s.status !== 'GRADED');
    }
    return list;
  });

  pendingCount = computed(() => this.submissions().filter(s => s.status !== 'GRADED').length);
  gradedCount = computed(() => this.submissions().filter(s => s.status === 'GRADED').length);

  ngOnInit() {
    this.courseId.set(this.route.snapshot.paramMap.get('courseId') ?? '');
    this.taskId.set(this.route.snapshot.paramMap.get('taskId') ?? '');
    this.loadTask();
    this.loadSubmissions();
  }

  goBack() {
    void this.router.navigate(['/profesor/cursos', this.courseId()]);
  }

  loadTask() {
    this.teacherService.getTask(this.courseId(), this.taskId()).subscribe({
      next: (data) => this.task.set(data),
      error: () => this.error.set('No se pudo cargar la tarea')
    });
  }

  loadSubmissions() {
    this.loading.set(true);
    this.teacherService.getSubmissions(this.courseId(), this.taskId(), {}).subscribe({
      next: (data) => {
        this.submissions.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar entregas');
        this.loading.set(false);
      }
    });
  }

  deliveryTypeLabel(dt?: string): string {
    switch (dt) {
      case 'texto': return 'Texto en línea';
      case 'ambos': return 'Archivo y texto';
      case 'clase': return 'En clase';
      default: return 'Archivo';
    }
  }

  /** Calificar o editar nota: en clase siempre; resto solo si ya entregó en el portal. */
  canOpenGrading(sub: TaskSubmission): boolean {
    const t = this.task();
    if (!t) return false;
    if (sub.status === 'GRADED') return true;
    const dt = t.deliveryType ?? 'archivo';
    if (dt === 'clase') return true;
    return !!sub.submittedAt;
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'Pendiente';
      case 'SUBMITTED': return 'Entregada';
      case 'LATE': return 'Entrega tardía';
      case 'GRADED': return 'Calificada';
      default: return status;
    }
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'GRADED': return 'badge-success';
      case 'SUBMITTED': return 'badge-info';
      case 'LATE': return 'badge-warning';
      default: return 'badge-secondary';
    }
  }

  openGradeModal(sub: TaskSubmission) {
    if (!this.canOpenGrading(sub)) return;
    this.selectedSubmission.set(sub);
    const max = this.task()?.maxScore ?? 20;
    const score = sub.score != null && sub.score >= 0 ? sub.score : 0;
    this.gradeForm.set({ score: Math.min(score, max), feedback: sub.feedback ?? '' });
    this.showGradingModal.set(true);
  }

  closeGradeModal() {
    this.selectedSubmission.set(null);
    this.showGradingModal.set(false);
  }

  saveGrade() {
    const sub = this.selectedSubmission();
    const t = this.task();
    if (!sub || !t) return;
    const max = t.maxScore ?? 20;
    let { score, feedback } = this.gradeForm();
    if (score < 0) score = 0;
    if (score > max) score = max;

    this.saving.set(true);
    this.teacherService
      .gradeStudentForTask(this.courseId(), this.taskId(), {
        studentId: sub.student.id,
        score,
        feedback: feedback || undefined
      })
      .subscribe({
        next: (updated) => {
          this.submissions.update(list =>
            list.map(s => (s.student.id === updated.student.id ? updated : s)),
          );
          this.closeGradeModal();
          this.saving.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.error?.message ?? 'Error al guardar calificación');
          this.saving.set(false);
        }
      });
  }

  getStudentName(sub: TaskSubmission): string {
    const u = sub.student.user;
    return `${u.firstName} ${u.lastName}`.trim();
  }

  updateGradeScore(value: number) {
    this.gradeForm.update(g => ({ ...g, score: value }));
  }

  updateGradeFeedback(text: string) {
    this.gradeForm.update(g => ({ ...g, feedback: text }));
  }

  downloadSubmissionAttachment(sub: TaskSubmission, file: { id: string; name: string }) {
    const fid = file?.id;
    if (!fid) return;
    const submissionId = sub.id;
    if (!submissionId) {
      this.downloadError.set(
        'Esta fila no tiene id de entrega en el servidor; no se puede descargar. Actualiza la página o revisa la API.',
      );
      return;
    }
    this.downloadError.set('');
    const fallback = (file.name && String(file.name).trim()) || 'archivo';

    this.teacherService
      .downloadTeacherSubmissionAttachmentBlob(this.courseId(), this.taskId(), submissionId, fid)
      .subscribe({
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

  /** Si `url` es una URL pública https, abrir en pestaña; si no, usar solo API. */
  openAttachmentIfPublicUrl(url: string | undefined): void {
    const u = (url ?? '').trim();
    if (!u || !/^https?:\/\//i.test(u)) return;
    window.open(u, '_blank', 'noopener,noreferrer');
  }

  private triggerBlobDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.trim() || 'descarga';
    a.click();
    URL.revokeObjectURL(url);
  }

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
    if (e?.status === 403) {
      return 'El servidor no autoriza esta descarga con tu rol. Hace falta un endpoint en el API para que el docente obtenga los adjuntos de las entregas.';
    }
    if (e?.status === 404) {
      return 'Ninguna ruta de descarga del profesor respondió en el servidor. Hay que implementar en el API un GET para adjuntos de entregas (por ejemplo bajo teacher/courses/.../tasks/.../submissions/.../attachments/.../download o submission-attachments en contexto docente).';
    }
    if (e?.error instanceof Blob) {
      try {
        const t = await e.error.text();
        const j = JSON.parse(t) as { error?: { message?: string } };
        if (j?.error?.message) return j.error.message;
      } catch {
        /* ignore */
      }
    }
    const nested = (e?.error as { error?: { message?: string } })?.error?.message;
    if (typeof nested === 'string' && nested.trim()) return nested;
    return 'No se pudo descargar el archivo. Si la sesión expiró, vuelve a iniciar sesión.';
  }
}
