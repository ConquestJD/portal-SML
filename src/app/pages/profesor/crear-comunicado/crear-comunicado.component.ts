import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TeacherService, TeacherCourse } from '../../../services/teacher.service';
import {
  AnnouncementService,
  AnnouncementAttachment,
} from '../../../services/announcement.service';

@Component({
  selector: 'app-crear-comunicado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-comunicado.component.html',
  styleUrl: './crear-comunicado.component.css',
})
export class CrearComunicadoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teacherService = inject(TeacherService);
  private readonly announcementService = inject(AnnouncementService);

  courseId = signal('');
  /** Id del comunicado si estamos editando; `null` en creación. */
  editingAnnouncementId = signal<string | null>(null);
  readonly isEditMode = computed(() => this.editingAnnouncementId() !== null);

  loading = signal(true);
  error = signal('');
  saving = signal(false);
  course = signal<TeacherCourse | null>(null);

  title = signal('');
  content = signal('');
  /** Valores API: LOW | MEDIUM | HIGH */
  priority = signal<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

  selectedFiles = signal<File[]>([]);
  existingAttachments = signal<AnnouncementAttachment[]>([]);
  loadedType = signal<string>('GENERAL');
  loadedTargetRoles = signal<string[]>([]);
  fileDragOver = signal(false);

  pageTitle = computed(() => this.isEditMode() ? 'Editar comunicado' : 'Nuevo comunicado');
  canSave = computed(() => this.title().trim().length > 0 && this.content().trim().length > 0);
  remainingSlots = computed(() => Math.max(0, 5 - this.existingAttachments().length - this.selectedFiles().length));

  courseSubtitle = computed(() => {
    const c = this.course();
    if (!c) return '';
    const name = c.course?.name ?? c.name ?? '';
    const g = this.courseGradeLabel();
    return g ? `${name} · ${g}` : name;
  });

  ngOnInit() {
    const cid = this.route.snapshot.paramMap.get('courseId') ?? '';
    const rawComunicado = this.route.snapshot.paramMap.get('comunicadoId') ?? '';
    const editId =
      rawComunicado && rawComunicado.toLowerCase() !== 'nuevo'
        ? rawComunicado
        : null;

    this.courseId.set(cid);
    this.editingAnnouncementId.set(editId);

    if (!cid) {
      this.error.set('Curso no válido');
      this.loading.set(false);
      return;
    }

    if (editId) {
      forkJoin({
        course: this.teacherService.getCourse(cid),
        ann: this.announcementService.getAnnouncement(editId),
      }).subscribe({
        next: ({ course, ann }) => {
          this.course.set(course);
          this.title.set(ann.title);
          this.content.set(ann.content);
          const p = (ann.priority || 'MEDIUM').toUpperCase();
          this.priority.set(
            p === 'HIGH' || p === 'LOW' || p === 'MEDIUM'
              ? (p as 'LOW' | 'MEDIUM' | 'HIGH')
              : 'MEDIUM',
          );
          this.existingAttachments.set(ann.attachments ?? []);
          this.loadedType.set(ann.type || 'GENERAL');
          this.loadedTargetRoles.set(ann.targetRoles ?? []);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(
            err?.error?.error?.message ?? 'No se pudo cargar el comunicado',
          );
          this.loading.set(false);
        },
      });
      return;
    }

    this.teacherService.getCourse(cid).subscribe({
      next: (c) => {
        this.course.set(c);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el curso');
        this.loading.set(false);
      },
    });
  }

  courseGradeLabel(): string {
    const c = this.course();
    if (!c) return '';
    const grade = (c.course?.grade ?? c.grade ?? '').trim();
    const level = (c.course?.level ?? '').trim();
    return [grade, level].filter(Boolean).join(' · ');
  }

  cancel() {
    void this.router.navigate(['/profesor/cursos', this.courseId()], {
      queryParams: { tab: 'comunicados' },
    });
  }

  fileKey(f: File): string {
    return `${f.name}-${f.size}-${f.lastModified}`;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.addFiles(Array.from(input.files ?? []));
    input.value = '';
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

  private addFiles(incoming: File[]) {
    const allowed = this.filterAcceptedFiles(incoming);
    if (!allowed.length) return;
    const maxNew = Math.max(0, 5 - this.existingAttachments().length);
    const current = this.selectedFiles();
    const seen = new Set(current.map(f => this.fileKey(f)));
    const next = [...current];
    for (const f of allowed) {
      const k = this.fileKey(f);
      if (seen.has(k)) continue;
      seen.add(k);
      next.push(f);
      if (next.length >= maxNew) break;
    }
    this.selectedFiles.set(next.slice(0, maxNew));
  }

  private filterAcceptedFiles(files: File[]): File[] {
    const ok = /\.(pdf|docx?|pptx?|xlsx?|jpe?g|png|zip)$/i;
    return files.filter(f => ok.test(f.name) && f.size <= 20 * 1024 * 1024);
  }

  removeFile(file: File) {
    const k = this.fileKey(file);
    this.selectedFiles.set(
      this.selectedFiles().filter((f) => this.fileKey(f) !== k),
    );
  }

  openExistingAttachment(att: AnnouncementAttachment) {
    const aid = this.editingAnnouncementId();
    if (!aid || !att.id) return;
    window.open(
      this.announcementService.getDownloadUrl(aid, att.id),
      '_blank',
      'noopener,noreferrer',
    );
  }

  priorityLabel(): string {
    const p = this.priority();
    if (p === 'HIGH') return 'Urgente';
    if (p === 'LOW') return 'Normal';
    return 'Importante';
  }

  priorityBadgeClass(): string {
    const p = this.priority();
    if (p === 'HIGH') return 'badge-warning';
    if (p === 'LOW') return 'badge-secondary';
    return 'badge-info';
  }

  saveComunicado() {
    if (!this.canSave()) return;
    this.saving.set(true);
    this.error.set('');

    const editId = this.editingAnnouncementId();
    if (editId) {
      const dto: {
        title: string;
        content: string;
        priority: string;
        type: string;
        targetRoles?: string[];
      } = {
        title: this.title().trim(),
        content: this.content().trim(),
        priority: this.priority(),
        type: this.loadedType() || 'GENERAL',
      };
      const tr = this.loadedTargetRoles();
      if (tr.length) dto.targetRoles = tr;

      this.announcementService
        .update(editId, dto)
        .pipe(
          switchMap(() => {
            const files = this.selectedFiles();
            if (!files.length) return of(null);
            return this.announcementService.uploadAttachments(editId, files);
          }),
        )
        .subscribe({
          next: () => {
            this.saving.set(false);
            void this.router.navigate(['/profesor/cursos', this.courseId()], {
              queryParams: { tab: 'comunicados' },
            });
          },
          error: (err) => {
            this.error.set(
              err?.error?.error?.message ?? 'Error al guardar el comunicado',
            );
            this.saving.set(false);
          },
        });
      return;
    }

    const fd = new FormData();
    fd.append('title', this.title().trim());
    fd.append('content', this.content().trim());
    fd.append('type', 'GENERAL');
    fd.append('priority', this.priority());
    this.selectedFiles().forEach((f) => fd.append('files', f));

    this.teacherService.createCourseAnnouncement(this.courseId(), fd).subscribe({
      next: () => {
        this.saving.set(false);
        void this.router.navigate(['/profesor/cursos', this.courseId()], {
          queryParams: { tab: 'comunicados' },
        });
      },
      error: (err) => {
        this.error.set(
          err?.error?.error?.message ?? 'Error al publicar el comunicado',
        );
        this.saving.set(false);
      },
    });
  }
}
