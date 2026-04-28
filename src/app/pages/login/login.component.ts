import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private readonly _username = signal('');
  private readonly _password = signal('');
  private readonly _rememberMe = signal(false);

  get username(): string { return this._username(); }
  set username(v: string) { this._username.set(v); }

  get password(): string { return this._password(); }
  set password(v: string) { this._password.set(v); }

  get rememberMe(): boolean { return this._rememberMe(); }
  set rememberMe(v: boolean) { this._rememberMe.set(v); }

  showPassword = signal(false);
  isLoading = signal(false);
  error = signal('');
  info = signal('');

  usernameTouched = signal(false);
  passwordTouched = signal(false);
  isVisible = signal(false);

  currentYear = new Date().getFullYear();

  usernameError = computed(() => {
    if (!this.usernameTouched()) return '';
    const v = this._username().trim();
    if (!v) return 'El usuario es obligatorio';
    if (v.length < 3) return 'Mínimo 3 caracteres';
    return '';
  });

  passwordError = computed(() => {
    if (!this.passwordTouched()) return '';
    if (!this._password()) return 'La contraseña es obligatoria';
    if (this._password().length < 4) return 'Mínimo 4 caracteres';
    return '';
  });

  isFormValid = computed(() =>
    this._username().trim().length >= 3 &&
    this._password().length >= 4 &&
    !this.usernameError() &&
    !this.passwordError()
  );

  constructor(private authService: AuthService) {}

  ngOnInit() {
    requestAnimationFrame(() => this.isVisible.set(true));
  }

  togglePasswordVisibility() { this.showPassword.update(v => !v); }
  onUsernameBlur() { this.usernameTouched.set(true); }
  onPasswordBlur() { this.passwordTouched.set(true); }

  onSubmit() {
    this.usernameTouched.set(true);
    this.passwordTouched.set(true);

    if (!this.isFormValid()) {
      this.error.set('Por favor corrige los errores del formulario');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');
    this.info.set('');

    const identifier = this._username().trim();
    this.authService.login(identifier, this._password(), this._rememberMe()).subscribe({
      next: () => { this.isLoading.set(false); },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.error?.error?.message || 'Credenciales incorrectas. Intenta de nuevo.';
        this.error.set(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    });
  }

  forgotPassword() {
    this.error.set('');
    this.info.set('Si olvidaste tu contraseña, contacta al administrador del colegio para que la restablezca desde el panel de administración.');
  }
}
