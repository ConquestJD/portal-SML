import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TeacherService, TeacherProfile } from '../../../services/teacher.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-perfil-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './perfil-profesor.component.html',
  styleUrl: './perfil-profesor.component.css',
})
export class PerfilProfesorComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  saving = signal(false);
  success = signal('');
  editing = signal(false);
  photoBroken = signal(false);
  readonly isLoading = this.loading;
  readonly isSaving = this.saving;

  profile = signal<TeacherProfile | null>(null);
  phone = signal('');
  bio = signal('');

  changePasswordForm = signal({ currentPassword: '', newPassword: '', confirmPassword: '' });
  passwordError = signal('');
  passwordSuccess = signal('');

  fullName = computed(() => {
    const p = this.profile();
    if (!p) return '';
    return `${p.user.firstName} ${p.user.lastName}`.trim();
  });

  initials = computed(() => {
    const parts = this.fullName().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return parts.slice(0, 2).map(w => w[0]).join('').toUpperCase();
  });

  photoUrl = computed(() => this.profile()?.user.avatarUrl || '');

  courses = computed(() => {
    const list = this.profile()?.assignments ?? [];
    return list.map(a => {
      const name = a.course?.name ?? 'Curso';
      const meta = [a.course?.grade, a.course?.level].filter(Boolean).join(' · ');
      return { id: a.id, label: meta ? `${name} · ${meta}` : name };
    });
  });

  constructor(
    private teacherService: TeacherService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.teacherService.getProfile().subscribe({
      next: data => {
        this.profile.set(data);
        this.phone.set(data.user.phone ?? '');
        this.bio.set(data.bio ?? '');
        this.photoBroken.set(false);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el perfil.');
        this.loading.set(false);
      },
    });
  }

  startEditing() {
    this.editing.set(true);
    this.success.set('');
  }

  cancelEditing() {
    const p = this.profile();
    this.phone.set(p?.user.phone ?? '');
    this.bio.set(p?.bio ?? '');
    this.editing.set(false);
  }

  saveProfile() {
    this.saving.set(true);
    this.error.set('');
    this.teacherService.updateProfile({ phone: this.phone().trim(), bio: this.bio() }).subscribe({
      next: data => {
        this.profile.set(data);
        this.phone.set(data.user.phone ?? '');
        this.bio.set(data.bio ?? '');
        this.editing.set(false);
        this.success.set('Perfil actualizado.');
        this.saving.set(false);
        setTimeout(() => this.success.set(''), 3000);
      },
      error: err => {
        this.error.set(err?.error?.error?.message ?? 'No se pudo guardar.');
        this.saving.set(false);
      },
    });
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.teacherService.uploadPhoto(file).subscribe({
      next: data => {
        const url =
          (data as TeacherProfile).user?.avatarUrl ??
          (data as unknown as { avatarUrl?: string }).avatarUrl;
        this.profile.update(p => {
          if (!p || !url) return p;
          return { ...p, user: { ...p.user, avatarUrl: url } };
        });
        this.photoBroken.set(false);
        this.success.set('Foto actualizada.');
        setTimeout(() => this.success.set(''), 3000);
      },
      error: () => this.error.set('No se pudo subir la foto.'),
    });
  }

  onPhotoError() {
    this.photoBroken.set(true);
  }

  setCurrentPassword(value: string) {
    this.changePasswordForm.update(f => ({ ...f, currentPassword: value }));
  }

  setNewPassword(value: string) {
    this.changePasswordForm.update(f => ({ ...f, newPassword: value }));
  }

  setConfirmPassword(value: string) {
    this.changePasswordForm.update(f => ({ ...f, confirmPassword: value }));
  }

  changePassword() {
    const { currentPassword, newPassword, confirmPassword } = this.changePasswordForm();
    if (!currentPassword || !newPassword) {
      this.passwordError.set('Completa la contraseña actual y la nueva.');
      return;
    }
    if (newPassword.length < 6) {
      this.passwordError.set('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.passwordError.set('Las contraseñas no coinciden.');
      return;
    }
    this.passwordError.set('');
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.passwordSuccess.set('Contraseña actualizada.');
        this.changePasswordForm.set({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => this.passwordSuccess.set(''), 3000);
      },
      error: err => {
        this.passwordError.set(err?.error?.error?.message ?? 'No se pudo cambiar la contraseña.');
      },
    });
  }
}
