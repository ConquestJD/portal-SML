import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService, StudentSettings } from '../../services/student.service';
import { AuthService } from '../../services/auth.service';

type ConfigTab = 'cuenta' | 'preferencias' | 'notificaciones';

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
  error = signal('');
  success = signal('');
  activeTab = signal<ConfigTab>('cuenta');

  settings = signal<StudentSettings>({ notifications: true, language: 'es', theme: 'light' });

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
        this.settings.set({
          notifications: data?.notifications ?? true,
          language: data?.language ?? 'es',
          theme: data?.theme ?? 'light',
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setTab(t: ConfigTab) {
    this.activeTab.set(t);
  }

  saveSettings() {
    this.saving.set(true);
    this.error.set('');
    this.studentService.updateSettings(this.settings()).subscribe({
      next: (data) => {
        this.settings.set(data);
        this.success.set('Configuración guardada');
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
    if (!currentPassword || !newPassword) {
      this.passwordError.set('Completa todos los campos');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.passwordError.set('Las contraseñas no coinciden');
      return;
    }
    this.passwordError.set('');
    this.passwordSuccess.set('');
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.passwordSuccess.set('Contraseña actualizada');
        this.changePasswordForm.set({ currentPassword: '', newPassword: '', confirmPassword: '' });
      },
      error: (err) =>
        this.passwordError.set(err?.error?.error?.message ?? 'Error al cambiar contraseña'),
    });
  }

  updateSetting(field: keyof StudentSettings, value: unknown) {
    this.settings.update((s) => ({ ...s, [field]: value }));
  }

  updatePwForm(field: 'currentPassword' | 'newPassword' | 'confirmPassword', value: string) {
    this.changePasswordForm.update((d) => ({ ...d, [field]: value }));
  }

  logout() {
    this.authService.logout();
  }
}
