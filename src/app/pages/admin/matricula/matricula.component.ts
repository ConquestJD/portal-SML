import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, EnrollmentItem, AcademicYearItem, SectionItem, StudentItem, activeAcademicYear } from '../../../services/admin.service';

@Component({
  selector: 'app-matricula',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './matricula.component.html',
  styleUrl: './matricula.component.css'
})
export class MatriculaComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  showForm = signal(false);
  saving = signal(false);
  busyId = signal('');

  enrollments = signal<EnrollmentItem[]>([]);
  academicYears = signal<AcademicYearItem[]>([]);
  sections = signal<SectionItem[]>([]);
  students = signal<StudentItem[]>([]);

  filterGrade = signal('');
  filterYear = signal('');
  currentPage = signal(1);
  totalPages = signal(1);

  formData = signal({ studentId: '', sectionId: '', academicYearId: '', grade: '', section: '', academicYear: '' });

  studentsWithoutEnrollment = computed(() =>
    this.students().filter(s => s.enrollmentKind === 'none')
  );

  yearSections = computed(() => {
    const yearId = this.formData().academicYearId;
    return this.sections().filter(s => !yearId || s.academicYear?.id === yearId);
  });

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.adminService.getAcademicYears().subscribe({
      next: d => {
        this.academicYears.set(d);
        const active = activeAcademicYear(d);
        if (active) {
          this.filterYear.set(active.name);
          this.formData.update(f => ({ ...f, academicYearId: active.id, academicYear: active.name }));
          this.adminService.getSections({ academicYearId: active.id }).subscribe({ next: ({ data }) => this.sections.set(data) });
        } else {
          this.adminService.getSections().subscribe({ next: ({ data }) => this.sections.set(data) });
        }
        this.load();
      },
      error: () => this.load(),
    });
    this.adminService.getStudents({ pageSize: 100 }).subscribe({ next: ({ data }) => this.students.set(data) });
  }

  load() {
    this.loading.set(true);
    this.adminService.getEnrollments({
      grade: this.filterGrade() || undefined,
      year: this.filterYear() || undefined,
      page: this.currentPage(),
      pageSize: 20
    }).subscribe({
      next: ({ data, meta }) => {
        this.enrollments.set(data);
        this.totalPages.set(meta.totalPages);
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar matrículas'); this.loading.set(false); }
    });
  }

  save() {
    const { studentId, sectionId, academicYearId } = this.formData();
    if (!studentId || !sectionId) return;
    if (!academicYearId) {
      this.error.set('No hay año lectivo vigente.');
      return;
    }
    this.error.set('');
    this.saving.set(true);
    this.adminService.createEnrollment({ studentId, sectionId, academicYearId }).subscribe({
      next: () => {
        this.showForm.set(false);
        this.saving.set(false);
        this.adminService.getStudents({ pageSize: 100 }).subscribe({ next: ({ data }) => this.students.set(data) });
        this.load();
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'No se pudo matricular al estudiante.');
        this.saving.set(false);
      }
    });
  }

  updateStatus(enrollment: EnrollmentItem, status: string) {
    if (status === 'WITHDRAWN') {
      const name = `${enrollment.student?.user?.firstName ?? ''} ${enrollment.student?.user?.lastName ?? ''}`.trim() || 'este alumno';
      if (!confirm(`¿Registrar retiro anticipado de ${name}? Se cancelarán las pensiones de los meses siguientes. El mes en curso se mantiene.`)) {
        return;
      }
    }
    this.error.set('');
    this.busyId.set(enrollment.id);
    this.adminService.updateEnrollment(enrollment.id, { status }).subscribe({
      next: () => {
        this.busyId.set('');
        this.load();
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'No se pudo actualizar la matrícula.');
        this.busyId.set('');
      }
    });
  }

  update(field: string, value: string) { this.formData.update(d => ({ ...d, [field]: value })); }

  enrollStudent() {
    const active = activeAcademicYear(this.academicYears());
    this.formData.set({
      studentId: '',
      sectionId: '',
      academicYearId: active?.id ?? '',
      grade: '',
      section: '',
      academicYear: active?.name ?? '',
    });
    this.error.set('');
    this.showForm.set(true);
  }

  enrollmentStatusLabel(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'Matriculado',
      WITHDRAWN: 'Retiro anticipado',
      TRANSFERRED: 'Trasladado',
      COMPLETED: 'Completado',
    };
    return map[status] ?? status;
  }

  studentLabel(s: StudentItem): string {
    return s.name || `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`.trim() || 'Estudiante';
  }
}
