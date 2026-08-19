import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../services/student.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.css'
})
export class ConfiguracionComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  passwordSaving = signal(false);
  error = signal('');
  success = signal('');

  notifications = signal(true);

  changePasswordForm = signal({ currentPassword: '', newPassword: '', confirmPassword: '' });
  passwordError = signal('');
  passwordSuccess = signal('');

  accountEmail = computed(() => this.authService.user()?.email ?? '—');
  accountName = computed(() => this.authService.user()?.name ?? '—');

  constructor(
    private studentService: StudentService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.studentService.getSettings().subscribe({
      next: (data) => {
        this.notifications.set(data?.notifications ?? true);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  saveNotifications() {
    this.saving.set(true);
    this.error.set('');
    this.studentService.updateSettings({ notifications: this.notifications() }).subscribe({
      next: (data) => {
        this.notifications.set(data?.notifications ?? this.notifications());
        this.success.set('Preferencias de avisos guardadas.');
        this.saving.set(false);
        setTimeout(() => this.success.set(''), 3000);
      },
      error: () => {
        this.error.set('No se pudo guardar la configuración.');
        this.saving.set(false);
      },
    });
  }

  changePassword() {
    const { currentPassword, newPassword, confirmPassword } = this.changePasswordForm();
    if (!currentPassword || !newPassword || !confirmPassword) {
      this.passwordError.set('Completa todos los campos.');
      return;
    }
    if (newPassword.length < 8) {
      this.passwordError.set('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.passwordError.set('Las contraseñas no coinciden.');
      return;
    }
    this.passwordError.set('');
    this.passwordSuccess.set('');
    this.passwordSaving.set(true);
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.passwordSuccess.set('Contraseña actualizada.');
        this.changePasswordForm.set({ currentPassword: '', newPassword: '', confirmPassword: '' });
        this.passwordSaving.set(false);
        setTimeout(() => this.passwordSuccess.set(''), 3000);
      },
      error: (err) => {
        this.passwordError.set(err?.error?.error?.message ?? 'No se pudo cambiar la contraseña.');
        this.passwordSaving.set(false);
      },
    });
  }

  updatePwForm(field: 'currentPassword' | 'newPassword' | 'confirmPassword', value: string) {
    this.changePasswordForm.update((d) => ({ ...d, [field]: value }));
  }

  logout() {
    this.authService.logout();
  }
}
