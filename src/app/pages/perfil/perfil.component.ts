import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentService, StudentProfile } from '../../services/student.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  profile = signal<StudentProfile | null>(null);
  uploadSuccess = signal('');
  activeTab = signal('info');
  setTab(t: string) { this.activeTab.set(t); }

  studentData = computed(() => {
    const p = this.profile();
    const defaults: any = { photo: '', fullName: '', code: '', grade: '', section: '', user: { firstName: '', lastName: '', email: '', avatarUrl: '' }, studentCode: '', id: '', enrollments: [] as any[] };
    if (!p) return defaults;
    return {
      ...p,
      photo: p.user.avatarUrl ?? '',
      fullName: `${p.user.firstName} ${p.user.lastName}`,
      code: p.studentCode,
      grade: (p.enrollments as any[])?.[0]?.section?.grade ?? '',
      section: (p.enrollments as any[])?.[0]?.section?.name ?? ''
    };
  });

  constructor(private studentService: StudentService) {}

  ngOnInit() {
    this.studentService.getProfile().subscribe({
      next: (data) => { this.profile.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar perfil'); this.loading.set(false); }
    });
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.studentService.uploadPhoto(file).subscribe({
      next: (data) => { this.profile.set(data); this.uploadSuccess.set('Foto actualizada'); }
    });
  }

  getFullName(): string {
    const p = this.profile();
    if (!p) return '';
    return `${p.user.firstName} ${p.user.lastName}`;
  }

  getCurrentEnrollment(): any {
    return this.profile()?.enrollments?.[0];
  }
}
