import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-crear-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './crear-usuario.component.html',
  styleUrl: './crear-usuario.component.css'
})
export class CrearUsuarioComponent {
  isEditMode = signal(false);
  userId = signal('');

  formData = signal({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'estudiante' as 'estudiante' | 'profesor' | 'admin' | 'administrativo',
    status: 'activo' as 'activo' | 'inactivo' | 'suspendido',
    grade: '',
    section: '',
    dni: '',
    phone: '',
    address: ''
  });

  constructor(private route: ActivatedRoute) {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode.set(true);
        this.userId.set(params['id']);
        // Cargar datos del usuario
      }
    });
  }

  onSubmit() {
    console.log('Guardar usuario', this.formData());
  }

  resetPassword() {
    console.log('Resetear contraseña');
  }
}
