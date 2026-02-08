import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

interface Course {
  id: string;
  name: string;
  code: string;
  grade: string;
  section: string;
  students: number;
  period: string;
  status: 'active' | 'finished';
}

interface Statistic {
  label: string;
  value: number | string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-perfil-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './perfil-profesor.component.html',
  styleUrl: './perfil-profesor.component.css'
})
export class PerfilProfesorComponent implements OnInit {
  activeTab = signal<'perfil' | 'cursos' | 'configuracion' | 'seguridad'>('perfil');
  isEditing = signal(false);
  isSaving = signal(false);
  isLoading = signal(true);

  // Datos del perfil
  profileData = signal({
    id: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    specialization: '',
    bio: '',
    photo: '',
    address: '',
    birthDate: '',
    hireDate: '',
    status: 'active' as 'active' | 'inactive'
  });

  // Cursos a cargo
  courses = signal<Course[]>([]);

  // Estadísticas
  statistics = signal<Statistic[]>([]);

  // Configuración
  settings = signal({
    emailNotifications: true,
    smsNotifications: false,
    messageSignature: 'Prof. María González\nDepartamento de Matemática',
    autoReply: false,
    autoReplyMessage: ''
  });

  // Cambio de contraseña
  passwordData = signal({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.isLoading.set(true);
    
    // Simular carga de datos
    setTimeout(() => {
      const user = this.authService.user();
      
      this.profileData.set({
        id: user?.id || '1',
        name: user?.name || 'Prof. María González',
        email: user?.email || 'maria.gonzalez@colegio.edu',
        phone: '+51 987654321',
        department: 'Matemática',
        specialization: 'Álgebra y Geometría',
        bio: 'Profesora de Matemática con más de 10 años de experiencia en educación secundaria. Especializada en álgebra y geometría.',
        photo: user?.photo || 'https://via.placeholder.com/150',
        address: 'Av. Principal 123, Lima',
        birthDate: '1980-05-15',
        hireDate: '2015-03-01',
        status: 'active'
      });

      this.courses.set([
        {
          id: '1',
          name: 'Matemática',
          code: 'MAT-2024',
          grade: '3ro',
          section: 'A',
          students: 30,
          period: '2024-I',
          status: 'active'
        },
        {
          id: '2',
          name: 'Matemática',
          code: 'MAT-2024',
          grade: '3ro',
          section: 'B',
          students: 28,
          period: '2024-I',
          status: 'active'
        },
        {
          id: '3',
          name: 'Matemática',
          code: 'MAT-2024',
          grade: '4to',
          section: 'A',
          students: 32,
          period: '2024-I',
          status: 'active'
        },
        {
          id: '4',
          name: 'Álgebra',
          code: 'ALG-2023',
          grade: '5to',
          section: 'A',
          students: 25,
          period: '2023-II',
          status: 'finished'
        }
      ]);

      this.statistics.set([
        {
          label: 'Cursos Activos',
          value: this.courses().filter(c => c.status === 'active').length,
          icon: 'fas fa-book',
          color: 'primary'
        },
        {
          label: 'Total Estudiantes',
          value: this.courses().reduce((sum, c) => sum + c.students, 0),
          icon: 'fas fa-users',
          color: 'success'
        },
        {
          label: 'Años de Experiencia',
          value: this.calculateYearsOfExperience(),
          icon: 'fas fa-calendar-alt',
          color: 'info'
        },
        {
          label: 'Tareas Pendientes',
          value: 24,
          icon: 'fas fa-tasks',
          color: 'warning'
        }
      ]);

      this.isLoading.set(false);
    }, 500);
  }

  calculateYearsOfExperience(): number {
    const hireDate = new Date(this.profileData().hireDate);
    const today = new Date();
    return Math.floor((today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
  }

  setTab(tab: 'perfil' | 'cursos' | 'configuracion' | 'seguridad') {
    this.activeTab.set(tab);
  }

  startEditing() {
    this.isEditing.set(true);
  }

  cancelEditing() {
    this.isEditing.set(false);
    // Recargar datos originales
    this.loadProfile();
  }

  saveProfile() {
    this.isSaving.set(true);
    
    // Simular guardado
    setTimeout(() => {
      console.log('Guardando perfil:', this.profileData());
      this.isSaving.set(false);
      this.isEditing.set(false);
      // Aquí se actualizaría el perfil en el backend
    }, 1000);
  }

  saveSettings() {
    this.isSaving.set(true);
    
    setTimeout(() => {
      console.log('Guardando configuración:', this.settings());
      this.isSaving.set(false);
    }, 1000);
  }

  changePassword() {
    const passwordData = this.passwordData();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    this.isSaving.set(true);
    
    setTimeout(() => {
      console.log('Cambiando contraseña...');
      this.isSaving.set(false);
      this.passwordData.set({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      alert('Contraseña cambiada exitosamente');
    }, 1000);
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.profileData.update(data => ({
          ...data,
          photo: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  }

  activeCourses = computed(() => 
    this.courses().filter(c => c.status === 'active')
  );

  finishedCourses = computed(() => 
    this.courses().filter(c => c.status === 'finished')
  );

  // Métodos auxiliares para actualizar datos del perfil
  updateName(value: string) { this.profileData.update(d => ({ ...d, name: value })); }
  updateEmail(value: string) { this.profileData.update(d => ({ ...d, email: value })); }
  updatePhone(value: string) { this.profileData.update(d => ({ ...d, phone: value })); }
  updateAddress(value: string) { this.profileData.update(d => ({ ...d, address: value })); }
  updateBirthDate(value: string) { this.profileData.update(d => ({ ...d, birthDate: value })); }
  updateHireDate(value: string) { this.profileData.update(d => ({ ...d, hireDate: value })); }
  updateDepartment(value: string) { this.profileData.update(d => ({ ...d, department: value })); }
  updateSpecialization(value: string) { this.profileData.update(d => ({ ...d, specialization: value })); }
  updateBio(value: string) { this.profileData.update(d => ({ ...d, bio: value })); }

  updateEmailNotifications(value: boolean) { this.settings.update(s => ({ ...s, emailNotifications: value })); }
  updateSmsNotifications(value: boolean) { this.settings.update(s => ({ ...s, smsNotifications: value })); }
  updateMessageSignature(value: string) { this.settings.update(s => ({ ...s, messageSignature: value })); }
  updateAutoReply(value: boolean) { this.settings.update(s => ({ ...s, autoReply: value })); }
  updateAutoReplyMessage(value: string) { this.settings.update(s => ({ ...s, autoReplyMessage: value })); }

  updateCurrentPassword(value: string) { this.passwordData.update(p => ({ ...p, currentPassword: value })); }
  updateNewPassword(value: string) { this.passwordData.update(p => ({ ...p, newPassword: value })); }
  updateConfirmPassword(value: string) { this.passwordData.update(p => ({ ...p, confirmPassword: value })); }
}
