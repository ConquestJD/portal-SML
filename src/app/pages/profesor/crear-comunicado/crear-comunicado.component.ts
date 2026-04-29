import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TeacherService, TeacherCourse } from '../../../services/teacher.service';

@Component({
  selector: 'app-crear-comunicado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-comunicado.component.html',
  styleUrl: './crear-comunicado.component.css'
})
export class CrearComunicadoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teacherService = inject(TeacherService);

  courseId = signal('');
  loading = signal(true);
  error = signal('');
  saving = signal(false);
  course = signal<TeacherCourse | null>(null);

  title = signal('');
  content = signal('');
  /** Valores API: LOW | MEDIUM | HIGH */
  priority = signal<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

  selectedFiles = signal<File[]>([]);

  courseSubtitle = computed(() => {
    const c = this.course();
    if (!c) return '';
    const name = c.course?.name ?? c.name ?? '';
    const g = this.courseGradeLabel();
    return g ? `${name} — ${g}` : name;
  });

  ngOnInit() {
    const cid = this.route.snapshot.paramMap.get('courseId') ?? '';
    this.courseId.set(cid);
    if (!cid) {
      this.error.set('Curso no válido');
      this.loading.set(false);
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
      }
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
    void this.router.navigate(['/profesor/cursos', this.courseId()]);
  }

  canSave(): boolean {
    return this.title().trim().length > 0 && this.content().trim().length > 0;
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
    const added = Array.from(input.files ?? []);
    const merged = [...this.selectedFiles(), ...added].slice(0, 5);
    this.selectedFiles.set(merged);
    input.value = '';
  }

  removeFile(file: File) {
    const k = this.fileKey(file);
    this.selectedFiles.set(this.selectedFiles().filter(f => this.fileKey(f) !== k));
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

    const fd = new FormData();
    fd.append('title', this.title().trim());
    fd.append('content', this.content().trim());
    fd.append('type', 'GENERAL');
    fd.append('priority', this.priority());
    this.selectedFiles().forEach(f => fd.append('files', f));

    this.teacherService.createCourseAnnouncement(this.courseId(), fd).subscribe({
      next: () => {
        this.saving.set(false);
        void this.router.navigate(['/profesor/cursos', this.courseId()], {
          queryParams: { tab: 'comunicados' }
        });
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'Error al publicar el comunicado');
        this.saving.set(false);
      }
    });
  }
}
