import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ProfilePhotoPickerComponent } from '../../../shared/components/profile-photo-picker/profile-photo-picker.component';

@Component({
  selector: 'app-perfil-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ProfilePhotoPickerComponent],
  templateUrl: './perfil-admin.component.html',
  styleUrl: './perfil-admin.component.css'
})
export class PerfilAdminComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  photoError = signal('');
  photoSuccess = signal('');
  passwordError = signal('');
  passwordSuccess = signal('');
  savingPassword = signal(false);

  readonly minPasswordLength = 8;

  passwordForm = signal({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  user = computed(() => this.authService.user());

  fullName = computed(() => {
    const u = this.user();
    return (u?.name ?? `${u?.firstName ?? ''} ${u?.lastName ?? ''}`).trim() || 'Administrador';
  });

  givenName = computed(() => this.user()?.firstName?.trim() || this.fullName());

  familyName = computed(() => this.user()?.lastName?.trim() || '');

  initials = computed(() => {
    const name = this.fullName();
    const parts = name.split(/\s+/).filter(Boolean);
    if (!parts.length) return 'A';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  });

  photoUrl = computed(() => this.user()?.photo ?? '');

  onPhotoFailed(message: string) {
    this.photoSuccess.set('');
    this.photoError.set(message);
  }

  onPhotoSucceeded(message: string) {
    this.photoError.set('');
    this.photoSuccess.set(message);
    setTimeout(() => this.photoSuccess.set(''), 3000);
  }

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.getMe().subscribe({
      next: () => this.loading.set(false),
      error: () => {
        if (this.authService.user()) {
          this.loading.set(false);
          return;
        }
        this.error.set('No se pudo cargar el perfil.');
        this.loading.set(false);
      },
    });
  }

  updatePassword(field: 'currentPassword' | 'newPassword' | 'confirmPassword', value: string) {
    this.passwordForm.update(d => ({ ...d, [field]: value }));
  }

  changePassword() {
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm();
    this.passwordError.set('');
    this.passwordSuccess.set('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      this.passwordError.set('Completa los tres campos');
      return;
    }
    if (newPassword.length < this.minPasswordLength) {
      this.passwordError.set(`La nueva contraseña debe tener al menos ${this.minPasswordLength} caracteres`);
      return;
    }
    if (newPassword !== confirmPassword) {
      this.passwordError.set('Las contraseñas no coinciden');
      return;
    }

    this.savingPassword.set(true);
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.passwordSuccess.set('Contraseña actualizada');
        this.passwordForm.set({ currentPassword: '', newPassword: '', confirmPassword: '' });
        this.savingPassword.set(false);
      },
      error: (err) => {
        this.passwordError.set(err?.error?.error?.message ?? err?.error?.message ?? 'No se pudo cambiar la contraseña');
        this.savingPassword.set(false);
      },
    });
  }
}
