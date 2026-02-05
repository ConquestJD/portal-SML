import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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

    // Simulación de login
    setTimeout(() => {
      this.isLoading.set(false);
      // Aquí iría la lógica real de autenticación
      console.log('Login attempt:', {
        username: this.username(),
        rememberMe: this.rememberMe()
      });
    }, 1500);
  }

  forgotPassword() {
    // Lógica para recuperar contraseña
    console.log('Forgot password clicked');
  }
}
