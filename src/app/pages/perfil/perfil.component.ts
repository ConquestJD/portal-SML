import { Component, signal, computed, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentService, StudentProfile } from '../../services/student.service';
import { filesFromClipboard } from '../profesor/_utils/clipboard-files';
import { pickLocalFiles } from '../profesor/_utils/pick-local-files';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  uploadError = signal('');
  uploadSuccess = signal('');
  uploading = signal(false);
  photoBroken = signal(false);
  photoDragOver = signal(false);
  profile = signal<StudentProfile | null>(null);

  @ViewChild('photoInput') photoInput?: ElementRef<HTMLInputElement>;

  fullName = computed(() => {
    const p = this.profile();
    if (!p) return '';
    return `${p.user.firstName ?? ''} ${p.user.lastName ?? ''}`.trim();
  });

  initials = computed(() => {
    const parts = this.fullName().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'E';
    return parts.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  });

  photoUrl = computed(() => this.profile()?.user?.avatarUrl ?? '');

  gradeLine = computed(() => {
    const p = this.profile();
    const enrollment = this.firstEnrollment(p);
    const grade = (p?.grade ?? enrollment.grade).trim();
    const level = (p?.level ?? enrollment.level).trim();
    return [grade, level].filter(Boolean).join(' · ');
  });

  academicYear = computed(() => this.firstEnrollment(this.profile()).academicYear);
  enrollmentStatus = computed(() => this.formatStatus(this.profile()?.status || this.firstEnrollment(this.profile()).status));

  constructor(private studentService: StudentService) {}

  ngOnInit() {
    this.studentService.getProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.photoBroken.set(false);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el perfil.');
        this.loading.set(false);
      },
    });
  }

  reload() {
    this.loading.set(true);
    this.error.set('');
    this.ngOnInit();
  }

  onPhotoError() {
    this.photoBroken.set(true);
  }

  async browsePhoto(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    const picked = await pickLocalFiles({ multiple: false, startIn: 'pictures' });
    if (picked === 'fallback') {
      this.photoInput?.nativeElement.click();
      return;
    }
    const file = picked[0];
    if (file) this.takePhotoFile(file);
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.takePhotoFile(file);
  }

  onPhotoDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.photoDragOver.set(true);
  }

  onPhotoDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const zone = event.currentTarget as HTMLElement;
    const next = event.relatedTarget as Node | null;
    if (next && zone.contains(next)) return;
    this.photoDragOver.set(false);
  }

  onPhotoDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.photoDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.takePhotoFile(file);
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    const file = filesFromClipboard(event)[0];
    if (file) this.takePhotoFile(file);
  }

  formatDate(raw?: string): string {
    if (!raw) return '—';
    const d = new Date(raw);
    return Number.isNaN(d.getTime())
      ? raw
      : d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatGender(raw?: string): string {
    const v = (raw ?? '').trim().toUpperCase();
    if (!v) return '—';
    if (['M', 'MALE', 'MASCULINO', 'HOMBRE'].includes(v)) return 'Masculino';
    if (['F', 'FEMALE', 'FEMENINO', 'MUJER'].includes(v)) return 'Femenino';
    return raw!.trim();
  }

  formatStatus(raw?: string): string {
    const v = (raw ?? '').trim().toUpperCase();
    if (v === 'ACTIVE' || v === 'ACTIVO') return 'Activo';
    if (v === 'INACTIVE' || v === 'INACTIVO') return 'Inactivo';
    if (v === 'SUSPENDED' || v === 'SUSPENDIDO') return 'Suspendido';
    return raw?.trim() || '—';
  }

  private takePhotoFile(file: File) {
    if (!file.type.startsWith('image/')) {
      this.uploadError.set('Elige una imagen JPG, PNG o WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.uploadError.set('La foto no puede superar 2 MB.');
      return;
    }
    this.uploadError.set('');
    this.uploadSuccess.set('');
    this.uploading.set(true);
    this.studentService.uploadPhoto(file).subscribe({
      next: (data) => {
        const url =
          (data as StudentProfile)?.user?.avatarUrl ??
          (data as { avatarUrl?: string })?.avatarUrl ??
          '';
        const current = this.profile();
        if (current && url) {
          this.profile.set({
            ...current,
            user: { ...current.user, avatarUrl: url },
          });
        }
        this.photoBroken.set(false);
        this.uploadSuccess.set('Foto actualizada.');
        this.uploading.set(false);
        setTimeout(() => this.uploadSuccess.set(''), 3000);
      },
      error: () => {
        this.uploadError.set('No se pudo subir la foto.');
        this.uploading.set(false);
      },
    });
  }

  private firstEnrollment(p: StudentProfile | null): {
    grade: string;
    level: string;
    academicYear: string;
    status: string;
  } {
    const e = (p?.enrollments as Record<string, unknown>[] | undefined)?.[0];
    if (!e) return { grade: '', level: '', academicYear: '', status: '' };
    const section = (e['section'] as Record<string, unknown> | undefined) ?? {};
    const year =
      (e['academicYear'] as Record<string, unknown> | undefined) ??
      (section['academicYear'] as Record<string, unknown> | undefined) ??
      {};
    return {
      grade: String(section['grade'] ?? e['grade'] ?? ''),
      level: String(section['level'] ?? e['level'] ?? ''),
      academicYear: String(year['name'] ?? e['academicYearName'] ?? ''),
      status: String(e['status'] ?? e['state'] ?? ''),
    };
  }
}
