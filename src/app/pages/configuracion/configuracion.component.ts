import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentService, StudentSettings } from '../../services/student.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.css'
})
export class ConfiguracionComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  success = signal('');
  activeTab = signal('cuenta');
  setTab(t: string) { this.activeTab.set(t); }

  settings = signal<StudentSettings>({ notifications: true, language: 'es', theme: 'light' });

  changePasswordForm = signal({ currentPassword: '', newPassword: '', confirmPassword: '' });
  passwordError = signal('');
  passwordSuccess = signal('');

  constructor(private studentService: StudentService, private authService: AuthService) {}

  ngOnInit() {
    this.studentService.getSettings().subscribe({
      next: (data) => { this.settings.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  saveSettings() {
    this.saving.set(true);
    this.studentService.updateSettings(this.settings()).subscribe({
      next: (data) => {
        this.settings.set(data);
        this.success.set('Configuración guardada');
        this.saving.set(false);
        setTimeout(() => this.success.set(''), 3000);
      },
      error: () => this.saving.set(false)
    });
  }

  changePassword() {
    const { currentPassword, newPassword, confirmPassword } = this.changePasswordForm();
    if (newPassword !== confirmPassword) { this.passwordError.set('Las contraseñas no coinciden'); return; }
    this.passwordError.set('');
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.passwordSuccess.set('Contraseña actualizada');
        this.changePasswordForm.set({ currentPassword: '', newPassword: '', confirmPassword: '' });
      },
      error: (err) => this.passwordError.set(err?.error?.error?.message ?? 'Error al cambiar contraseña')
    });
  }

  updateSetting(field: string, value: unknown) { this.settings.update(s => ({ ...s, [field]: value })); }
  updatePwForm(field: string, value: string) { this.changePasswordForm.update(d => ({ ...d, [field]: value })); }
}
