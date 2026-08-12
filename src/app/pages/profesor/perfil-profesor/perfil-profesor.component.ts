import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TeacherService, TeacherProfile } from '../../../services/teacher.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-perfil-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './perfil-profesor.component.html',
  styleUrl: './perfil-profesor.component.css'
})
export class PerfilProfesorComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  saving = signal(false);
  success = signal('');
  activeTab = signal('perfil');
  editing = signal(false);
  readonly isLoading = this.loading;
  readonly isSaving = this.saving;

  profile = signal<TeacherProfile | null>(null);
  formData = signal({ bio: '', specialty: '', phone: '' });
  editDraft = signal({
    name: '',
    email: '',
    phone: '',
    address: '',
    birthDate: '',
    hireDate: '',
    department: '',
    specialization: '',
    bio: '',
  });

  changePasswordForm = signal({ currentPassword: '', newPassword: '', confirmPassword: '' });

  profileData = computed(() => {
    const p = this.profile();
    const fallbackPhoto = '/images/default-avatar.png';
    if (!p) {
      return {
        name: '',
        email: '',
        phone: '',
        address: '',
        birthDate: '',
        hireDate: '',
        department: '',
        specialization: '',
        bio: '',
        photo: fallbackPhoto,
      };
    }
    if (this.editing()) {
      return { ...this.editDraft(), photo: p.user.avatarUrl ?? fallbackPhoto };
    }
    const fd = this.formData();
    return {
      name: `${p.user.firstName} ${p.user.lastName}`.trim(),
      email: p.user.email ?? '',
      phone: fd.phone || p.user.phone || '',
      address: '—',
      birthDate: '',
      hireDate: '',
      department: '—',
      specialization: fd.specialty || p.specialty || '—',
      bio: fd.bio ?? p.bio ?? '',
      photo: p.user.avatarUrl ?? fallbackPhoto,
    };
  });

  isEditing = computed(() => this.editing());
  passwordData = computed(() => this.changePasswordForm());
  passwordError = signal('');
  passwordSuccess = signal('');

  constructor(private teacherService: TeacherService, private authService: AuthService) {}

  ngOnInit() {
    this.teacherService.getProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.formData.set({
          bio: data.bio ?? '',
          specialty: data.specialty ?? '',
          phone: data.user.phone ?? ''
        });
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar perfil'); this.loading.set(false); }
    });
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
  }

  startEditing() {
    const pd = this.profileData();
    this.editDraft.set({
      name: pd.name,
      email: pd.email,
      phone: pd.phone,
      address: pd.address,
      birthDate: pd.birthDate,
      hireDate: pd.hireDate,
      department: pd.department,
      specialization: pd.specialization,
      bio: pd.bio,
    });
    this.editing.set(true);
  }

  cancelEditing() {
    const p = this.profile();
    if (p) {
      this.formData.set({
        bio: p.bio ?? '',
        specialty: p.specialty ?? '',
        phone: p.user.phone ?? '',
      });
    }
    this.editing.set(false);
  }

  private patchDraft(
    field: 'name' | 'email' | 'phone' | 'address' | 'birthDate' | 'hireDate' | 'department' | 'specialization' | 'bio',
    value: string,
  ) {
    this.editDraft.update((d) => ({ ...d, [field]: value }));
    if (field === 'phone') this.formData.update((f) => ({ ...f, phone: value }));
    if (field === 'bio') this.formData.update((f) => ({ ...f, bio: value }));
    if (field === 'specialization') this.formData.update((f) => ({ ...f, specialty: value }));
  }

  updateName(value: string) { this.patchDraft('name', value); }
  updateEmail(value: string) { this.patchDraft('email', value); }
  updatePhone(value: string) { this.patchDraft('phone', value); }
  updateAddress(value: string) { this.patchDraft('address', value); }
  updateBirthDate(value: string) { this.patchDraft('birthDate', value); }
  updateHireDate(value: string) { this.patchDraft('hireDate', value); }
  updateDepartment(value: string) { this.patchDraft('department', value); }
  updateSpecialization(value: string) { this.patchDraft('specialization', value); }
  updateBio(value: string) { this.patchDraft('bio', value); }

  updateCurrentPassword(value: string) {
    this.changePasswordForm.update((f) => ({ ...f, currentPassword: value }));
  }

  updateNewPassword(value: string) {
    this.changePasswordForm.update((f) => ({ ...f, newPassword: value }));
  }

  updateConfirmPassword(value: string) {
    this.changePasswordForm.update((f) => ({ ...f, confirmPassword: value }));
  }

  saveProfile() {
    this.saving.set(true);
    this.error.set('');
    this.teacherService.updateProfile(this.formData()).subscribe({
      next: (data) => {
        this.profile.set(data);
        this.editing.set(false);
        this.success.set('Perfil actualizado correctamente');
        this.saving.set(false);
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (err) => { this.error.set(err?.error?.error?.message ?? 'Error al guardar'); this.saving.set(false); }
    });
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.teacherService.uploadPhoto(file).subscribe({
      next: (data) => { this.profile.set(data); this.success.set('Foto actualizada'); }
    });
  }

  changePassword() {
    const { currentPassword, newPassword, confirmPassword } = this.changePasswordForm();
    if (newPassword !== confirmPassword) { this.passwordError.set('Las contraseñas no coinciden'); return; }
    this.passwordError.set('');
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => { this.passwordSuccess.set('Contraseña actualizada'); this.changePasswordForm.set({ currentPassword: '', newPassword: '', confirmPassword: '' }); },
      error: (err) => this.passwordError.set(err?.error?.error?.message ?? 'Error al cambiar contraseña')
    });
  }

  getFullName(): string {
    const p = this.profile();
    if (!p) return '';
    return `${p.user.firstName} ${p.user.lastName}`;
  }
}
