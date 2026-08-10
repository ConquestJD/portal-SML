import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService, StudentProfile } from '../../services/student.service';

type PerfilTab = 'personal' | 'academico' | 'foto';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  profile = signal<StudentProfile | null>(null);
  uploadSuccess = signal('');
  activeTab = signal<PerfilTab>('personal');

  studentData = computed(() => {
    const p = this.profile();
    const enrollment = this.firstEnrollment(p);
    return {
      photo: p?.user?.avatarUrl ?? '',
      fullName: p ? `${p.user.firstName ?? ''} ${p.user.lastName ?? ''}`.trim() : '',
      code: p?.studentCode ?? '',
      email: p?.user?.email ?? '',
      phone: p?.user?.phone ?? '',
      birthDate: p?.birthDate ?? '',
      address: p?.address ?? '',
      gender: p?.gender ?? '',
      bloodType: p?.bloodType ?? '',
      medicalNotes: p?.medicalNotes ?? '',
      grade: enrollment.grade,
      section: enrollment.section,
    };
  });

  academicData = computed(() => {
    const enrollment = this.firstEnrollment(this.profile());
    return {
      academicYear: enrollment.academicYear,
      status: enrollment.status,
      grade: enrollment.grade,
      section: enrollment.section,
    };
  });

  initials = computed(() => {
    const name = this.studentData().fullName.trim();
    if (!name) return 'E';
    const parts = name.split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'E';
  });

  constructor(private studentService: StudentService) {}

  ngOnInit() {
    this.studentService.getProfile().subscribe({
      next: (data) => { this.profile.set(data); this.loading.set(false); },
      error: () => { this.error.set('No se pudo cargar el perfil.'); this.loading.set(false); }
    });
  }

  setTab(t: PerfilTab) {
    this.activeTab.set(t);
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadSuccess.set('');
    this.studentService.uploadPhoto(file).subscribe({
      next: (data) => {
        this.profile.set(data);
        this.uploadSuccess.set('Foto actualizada');
        setTimeout(() => this.uploadSuccess.set(''), 3000);
      },
      error: () => this.uploadSuccess.set(''),
    });
    input.value = '';
  }

  formatDate(raw?: string): string {
    if (!raw) return '—';
    const d = new Date(raw);
    return Number.isNaN(d.getTime())
      ? raw
      : d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private firstEnrollment(p: StudentProfile | null): {
    grade: string;
    section: string;
    academicYear: string;
    status: string;
  } {
    const e = (p?.enrollments as Record<string, unknown>[] | undefined)?.[0];
    if (!e) return { grade: '', section: '', academicYear: '', status: '' };
    const section = (e['section'] as Record<string, unknown> | undefined) ?? {};
    const year =
      (e['academicYear'] as Record<string, unknown> | undefined) ??
      (section['academicYear'] as Record<string, unknown> | undefined) ??
      {};
    return {
      grade: String(section['grade'] ?? e['grade'] ?? ''),
      section: String(section['name'] ?? e['sectionName'] ?? ''),
      academicYear: String(year['name'] ?? e['academicYearName'] ?? ''),
      status: String(e['status'] ?? e['state'] ?? 'Activo'),
    };
  }
}
