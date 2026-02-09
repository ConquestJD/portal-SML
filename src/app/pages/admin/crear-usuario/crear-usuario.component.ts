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
  isProfessorMode = signal(false);

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
    address: '',
    // Campos específicos para profesores
    department: '',
    specialization: '',
    degree: '',
    university: ''
  });

  constructor(private route: ActivatedRoute) {
    // Detectar si viene desde estudiantes o profesores
    this.route.queryParams.subscribe(params => {
      if (params['tipo'] === 'estudiante' || this.route.snapshot.url.some(segment => segment.path === 'estudiantes')) {
        this.isStudentMode.set(true);
        this.formData.update(d => ({ ...d, role: 'estudiante', department: '', specialization: '', degree: '', university: '' }));
      } else if (params['tipo'] === 'profesor' || this.route.snapshot.url.some(segment => segment.path === 'profesores')) {
        this.isProfessorMode.set(true);
        this.formData.update(d => ({ ...d, role: 'profesor', department: '', specialization: '', degree: '', university: '' }));
      }
    });

    // Cargar datos si está en modo edición
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode.set(true);
        this.userId.set(params['id']);
        this.loadStudentData(params['id']);
      }
    });
  }

  loadStudentData(studentId: string) {
    // Simular carga de datos del estudiante
    // En producción, esto haría una llamada al API
    setTimeout(() => {
      // Datos mock de estudiantes - en producción vendría del API
      const studentsData: Record<string, any> = {
        '1': {
          name: 'Juan Pérez',
          email: 'juan@colegio.edu',
          username: 'S123456',
          password: '', // No se carga la contraseña por seguridad
          role: 'estudiante',
          status: 'activo',
          level: 'secundaria',
          grade: '3ro',
          dni: '12345678',
          phone: '+51 987654321',
          emergencyPhone: '+51 987654322',
          address: 'Av. Principal 123'
        },
        '2': {
          name: 'María García',
          email: 'maria@colegio.edu',
          username: 'S234567',
          password: '',
          role: 'estudiante',
          status: 'activo',
          level: 'secundaria',
          grade: '3ro',
          dni: '23456789',
          phone: '+51 987654323',
          emergencyPhone: '+51 987654324',
          address: 'Jr. Los Olivos 456'
        },
        '3': {
          name: 'Carlos López',
          email: 'carlos@colegio.edu',
          username: 'P345678',
          password: '',
          role: 'estudiante',
          status: 'activo',
          level: 'primaria',
          grade: '4to',
          dni: '34567890',
          phone: '+51 987654325',
          emergencyPhone: '+51 987654326',
          address: 'Calle Real 789'
        },
        '4': {
          name: 'Ana Martínez',
          email: 'ana@colegio.edu',
          username: 'S456789',
          password: '',
          role: 'estudiante',
          status: 'retirado',
          level: 'secundaria',
          grade: '4to',
          dni: '45678901',
          phone: '+51 987654327',
          emergencyPhone: '+51 987654328',
          address: 'Av. Libertad 321'
        }
      };

      const studentData = studentsData[studentId];
      if (studentData) {
        // Si es estudiante, activar modo estudiante
        this.isStudentMode.set(true);
        
        // Cargar datos en el formulario
        this.formData.set({
          name: studentData.name || '',
          email: studentData.email || '',
          username: studentData.username || '',
          password: '', // No se carga la contraseña
          role: studentData.role || 'estudiante',
          status: studentData.status || 'activo',
          level: studentData.level || '',
          grade: studentData.grade || '',
          dni: studentData.dni || '',
          phone: studentData.phone || '',
          emergencyPhone: studentData.emergencyPhone || '',
          address: studentData.address || '',
          department: '',
          specialization: '',
          degree: '',
          university: ''
        });
      }
    }, 300);
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
    } else if (this.isProfessorMode()) {
      return this.isEditMode() ? 'Editar Profesor' : 'Nuevo Profesor';
    }
    return this.isEditMode() ? 'Editar Usuario' : 'Nuevo Usuario';
  });

  pageSubtitle = computed(() => {
    if (this.isStudentMode()) {
      return this.isEditMode() ? 'Modifica la información del estudiante' : 'Registra un nuevo estudiante en el sistema';
    } else if (this.isProfessorMode()) {
      return this.isEditMode() ? 'Modifica la información del profesor' : 'Registra un nuevo profesor en el sistema';
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
