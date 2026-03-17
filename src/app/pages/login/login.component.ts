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
  // Private backing signals — ngModel uses getter/setter pairs to update them correctly
  private readonly _email = signal('');
  private readonly _password = signal('' );
  private readonly _rememberMe = signal(false);

  // Getter/setter pairs so [(ngModel)] reads the value and calls .set() on write
  get email(): string { return this._email(); }
  set email(v: string) { this._email.set(v); }

  get password(): string { return this._password(); }
  set password(v: string) { this._password.set(v); }

  get rememberMe(): boolean { return this._rememberMe(); }
  set rememberMe(v: boolean) { this._rememberMe.set(v); }

  // username is just an alias for email (template uses name="username")
  get username(): string { return this._email(); }
  set username(v: string) { this._email.set(v); }

  showPassword = signal(false);
  isLoading = signal(false);
  error = signal('');

  emailTouched = signal(false);
  passwordTouched = signal(false);
  isVisible = signal(false);

  currentYear = new Date().getFullYear();

  emailError = computed(() => {
    if (!this.emailTouched()) return '';
    if (!this._email().trim()) return 'El email es obligatorio';
    if (!this.isValidEmail(this._email())) return 'Ingresa un email válido';
    return '';
  });

  passwordError = computed(() => {
    if (!this.passwordTouched()) return '';
    if (!this._password()) return 'La contraseña es obligatoria';
    if (this._password().length < 4) return 'Mínimo 4 caracteres';
    return '';
  });

  isFormValid = computed(() =>
    this._email().trim().length > 0 &&
    this._password().length >= 4 &&
    !this.emailError() &&
    !this.passwordError()
  );

  usernameError = this.emailError;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    requestAnimationFrame(() => this.isVisible.set(true));
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  togglePasswordVisibility() { this.showPassword.update(v => !v); }
  onEmailBlur() { this.emailTouched.set(true); }
  onPasswordBlur() { this.passwordTouched.set(true); }
  onUsernameBlur() { this.onEmailBlur(); }

  onSubmit() {
    this.emailTouched.set(true);
    this.passwordTouched.set(true);

    if (!this.isFormValid()) {
      this.error.set('Por favor corrige los errores del formulario');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    this.authService.login(this._email(), this._password(), this._rememberMe()).subscribe({
      next: () => { this.isLoading.set(false); },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.error?.error?.message || 'Credenciales incorrectas. Intenta de nuevo.';
        this.error.set(msg);
      }
    });
  }

  forgotPassword() {
    if (!this._email().trim()) {
      this.error.set('Ingresa tu email para recuperar la contraseña');
      this.emailTouched.set(true);
      return;
    }
    this.authService.forgotPassword(this._email()).subscribe({
      next: () => this.error.set(''),
      error: () => {}
    });
  }
}
