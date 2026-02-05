import { Component, signal } from '@angular/core';
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
export class LoginComponent {
  username = signal('');
  password = signal('');
  rememberMe = signal(false);
  showPassword = signal(false);
  isLoading = signal(false);
  error = signal('');

  constructor(private authService: AuthService) {}

  togglePasswordVisibility() {
    this.showPassword.update(value => !value);
  }

  onSubmit() {
    if (!this.username() || !this.password()) {
      this.error.set('Por favor completa todos los campos');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    // Simular delay de red
    setTimeout(() => {
      const result = this.authService.login(
        this.username(),
        this.password(),
        this.rememberMe()
      );

      this.isLoading.set(false);

      if (!result.success) {
        this.error.set(result.message || 'Error al iniciar sesión');
      }
      // Si es exitoso, el servicio redirige automáticamente
    }, 800);
  }

  forgotPassword() {
    // Lógica para recuperar contraseña
    console.log('Forgot password clicked');
  }
}
