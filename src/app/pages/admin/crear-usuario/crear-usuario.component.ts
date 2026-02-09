import { Component, signal, computed } from '@angular/core';
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
  isStudentMode = signal(false);

  formData = signal({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'estudiante' as 'estudiante' | 'profesor' | 'admin' | 'administrativo',
    status: 'activo' as 'activo' | 'inactivo' | 'suspendido',
    level: '' as '' | 'secundaria' | 'primaria' | 'inicial',
    grade: '',
    dni: '',
    phone: '',
    emergencyPhone: '',
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

    // Detectar si viene desde estudiantes
    this.route.queryParams.subscribe(params => {
      if (params['tipo'] === 'estudiante' || this.route.snapshot.url.some(segment => segment.path === 'estudiantes')) {
        this.isStudentMode.set(true);
        this.formData.update(d => ({ ...d, role: 'estudiante' }));
      }
    });
  }

  generateUsername(): string {
    const level = this.formData().level;
    let prefix = 'U'; // Por defecto
    
    // Asignar prefijo según el nivel
    if (level === 'secundaria') {
      prefix = 'S';
    } else if (level === 'primaria') {
      prefix = 'P';
    }
    
    // Generar username con patrón [Prefijo] + 6 dígitos aleatorios
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const username = `${prefix}${randomNum}`;
    this.formData.update(d => ({ ...d, username }));
    return username;
  }

  onLevelChange() {
    const level = this.formData().level;
    if (level === 'inicial') {
      // Limpiar username y password para inicial
      this.formData.update(d => ({ ...d, username: '', password: '', grade: '' }));
    } else if (level && !this.isEditMode() && this.isStudentMode()) {
      // Generar nuevo username si cambia el nivel y no es inicial
      this.generateUsername();
    }
  }

  onGradeChange() {
    // Si cambia el grado, regenerar username si no es inicial
    if (this.formData().level !== 'inicial' && !this.isEditMode()) {
      this.generateUsername();
    }
  }

  availableGrades = computed(() => {
    const level = this.formData().level;
    if (level === 'secundaria') {
      return ['1ro', '2do', '3ro', '4to', '5to'];
    } else if (level === 'primaria') {
      return ['1ro', '2do', '3ro', '4to', '5to', '6to'];
    } else if (level === 'inicial') {
      return ['3 años', '4 años', '5 años'];
    }
    return [];
  });

  pageTitle = computed(() => {
    if (this.isStudentMode()) {
      return this.isEditMode() ? 'Editar Estudiante' : 'Nuevo Estudiante';
    }
    return this.isEditMode() ? 'Editar Usuario' : 'Nuevo Usuario';
  });

  pageSubtitle = computed(() => {
    if (this.isStudentMode()) {
      return this.isEditMode() ? 'Modifica la información del estudiante' : 'Registra un nuevo estudiante en el sistema';
    }
    return this.isEditMode() ? 'Modifica la información del usuario' : 'Registra un nuevo usuario en el sistema';
  });

  requiresCredentials = computed(() => {
    return this.formData().level !== 'inicial';
  });

  onSubmit() {
    console.log('Guardar usuario', this.formData());
  }

  resetPassword() {
    console.log('Resetear contraseña');
  }
}
