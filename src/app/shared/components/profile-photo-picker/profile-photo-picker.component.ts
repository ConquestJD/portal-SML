import { Component, ElementRef, HostListener, ViewChild, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { filesFromClipboard } from '../../../pages/profesor/_utils/clipboard-files';
import { pickLocalFiles } from '../../../pages/profesor/_utils/pick-local-files';

const MAX_BYTES = 8 * 1024 * 1024;

@Component({
  selector: 'app-profile-photo-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-photo-picker.component.html',
  styleUrl: './profile-photo-picker.component.css',
})
export class ProfilePhotoPickerComponent {
  photoUrl = input<string | null | undefined>('');
  initials = input('?');
  alt = input('Foto de perfil');
  variant = input<'ficha' | 'hero'>('ficha');

  uploaded = output<string>();
  failed = output<string>();
  succeeded = output<string>();

  uploading = signal(false);
  photoBroken = signal(false);
  dragOver = signal(false);

  @ViewChild('photoInput') photoInput?: ElementRef<HTMLInputElement>;

  constructor(private authService: AuthService) {}

  onImageError() {
    this.photoBroken.set(true);
  }

  async browse(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    const picked = await pickLocalFiles({ multiple: false, startIn: 'pictures' });
    if (picked === 'fallback') {
      this.photoInput?.nativeElement.click();
      return;
    }
    const file = picked[0];
    if (file) this.takeFile(file);
  }

  onSelected(event: Event) {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (file) this.takeFile(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const zone = event.currentTarget as HTMLElement;
    const next = event.relatedTarget as Node | null;
    if (next && zone.contains(next)) return;
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.takeFile(file);
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    const file = filesFromClipboard(event)[0];
    if (!file) return;
    event.preventDefault();
    this.takeFile(file);
  }

  private takeFile(file: File) {
    const okName = /\.(jpe?g|png|webp)$/i.test(file.name);
    const okType = /^image\/(jpeg|png|webp)$/i.test(file.type);
    if (!okName && !okType) {
      this.failed.emit('Usa una foto JPG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      this.failed.emit('La foto no debe superar 8 MB.');
      return;
    }
    this.uploading.set(true);
    this.authService.uploadPhoto(file).subscribe({
      next: (data) => {
        this.photoBroken.set(false);
        this.uploading.set(false);
        const url = data?.avatarUrl ?? '';
        if (url) this.uploaded.emit(url);
        this.succeeded.emit('Foto actualizada.');
      },
      error: (err) => {
        this.uploading.set(false);
        this.failed.emit(
          err?.error?.error?.message ?? err?.error?.message ?? 'No se pudo subir la foto.',
        );
      },
    });
  }
}
