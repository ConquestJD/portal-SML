import { Component, signal, OnInit } from '@angular/core';
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
  styleUrl: './perfil-profesor.component.css'
})
export class PerfilProfesorComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  saving = signal(false);
  success = signal('');
  activeTab = signal('perfil');
  readonly isLoading = this.loading;

  profile = signal<TeacherProfile | null>(null);
  formData = signal({ bio: '', specialty: '', phone: '' });

  changePasswordForm = signal({ currentPassword: '', newPassword: '', confirmPassword: '' });
  passwordError = signal('');
  passwordSuccess = signal('');

  constructor(private teacherService: TeacherService, private authService: AuthService) {}

  ngOnInit() {
    this.teacherService.getProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.formData.set({
          bio: data.bio ?? '',
          specialty: data.specialty ?? '',
          phone: data.user.phone ?? ''
        });
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar perfil'); this.loading.set(false); }
    });
  }

  saveProfile() {
    this.saving.set(true);
    this.error.set('');
    this.teacherService.updateProfile(this.formData()).subscribe({
      next: (data) => {
        this.profile.set(data);
        this.success.set('Perfil actualizado correctamente');
        this.saving.set(false);
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (err) => { this.error.set(err?.error?.error?.message ?? 'Error al guardar'); this.saving.set(false); }
    });
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.teacherService.uploadPhoto(file).subscribe({
      next: (data) => { this.profile.set(data); this.success.set('Foto actualizada'); }
    });
  }

  changePassword() {
    const { currentPassword, newPassword, confirmPassword } = this.changePasswordForm();
    if (newPassword !== confirmPassword) { this.passwordError.set('Las contraseñas no coinciden'); return; }
    this.passwordError.set('');
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => { this.passwordSuccess.set('Contraseña actualizada'); this.changePasswordForm.set({ currentPassword: '', newPassword: '', confirmPassword: '' }); },
      error: (err) => this.passwordError.set(err?.error?.error?.message ?? 'Error al cambiar contraseña')
    });
  }

  getFullName(): string {
    const p = this.profile();
    if (!p) return '';
    return `${p.user.firstName} ${p.user.lastName}`;
  }
}
