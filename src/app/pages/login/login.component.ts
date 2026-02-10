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
  username = signal('');
  password = signal('');
  rememberMe = signal(false);
  showPassword = signal(false);
  isLoading = signal(false);
  error = signal('');

  // Field-level validation
  usernameTouched = signal(false);
  passwordTouched = signal(false);

  // Animation
  isVisible = signal(false);

  currentYear = new Date().getFullYear();

  usernameError = computed(() => {
    if (!this.usernameTouched()) return '';
    if (!this.username().trim()) return 'El usuario o email es obligatorio';
    if (this.username().includes('@') && !this.isValidEmail(this.username())) {
      return 'Ingresa un email válido';
    }
    return '';
  });

  passwordError = computed(() => {
    if (!this.passwordTouched()) return '';
    if (!this.password()) return 'La contraseña es obligatoria';
    if (this.password().length < 4) return 'Mínimo 4 caracteres';
    return '';
  });

  isFormValid = computed(() => {
    return this.username().trim().length > 0
      && this.password().length >= 4
      && !this.usernameError()
      && !this.passwordError();
  });

  constructor(private authService: AuthService) {}

  ngOnInit() {
    // Trigger entrance animation
    requestAnimationFrame(() => {
      this.isVisible.set(true);
    });
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  onUsernameBlur() {
    this.usernameTouched.set(true);
  }

  onPasswordBlur() {
    this.passwordTouched.set(true);
  }

  onSubmit() {
    this.usernameTouched.set(true);
    this.passwordTouched.set(true);

    if (!this.isFormValid()) {
      this.error.set('Por favor corrige los errores del formulario');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    setTimeout(() => {
      const result = this.authService.login(
        this.username(),
        this.password(),
        this.rememberMe()
      );

      this.isLoading.set(false);

      if (!result.success) {
        this.error.set(result.message || 'Credenciales incorrectas. Intenta de nuevo.');
      }
    }, 800);
  }

  forgotPassword() {
    console.log('Forgot password clicked');
  }
}
