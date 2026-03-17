import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, EnrollmentItem, AcademicYearItem, SectionItem, StudentItem } from '../../../services/admin.service';

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

  enrollments = signal<EnrollmentItem[]>([]);
  academicYears = signal<AcademicYearItem[]>([]);
  sections = signal<SectionItem[]>([]);
  students = signal<StudentItem[]>([]);

  filterGrade = signal('');
  filterYear = signal('');
  currentPage = signal(1);
  totalPages = signal(1);

  formData = signal({ studentId: '', sectionId: '', academicYearId: '', grade: '', section: '', academicYear: '' });

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.adminService.getAcademicYears().subscribe({ next: d => this.academicYears.set(d) });
    this.adminService.getSections().subscribe({ next: ({ data }) => this.sections.set(data) });
    this.adminService.getStudents({ pageSize: 100 }).subscribe({ next: ({ data }) => this.students.set(data) });
    this.load();
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
    this.adminService.createEnrollment(this.formData()).subscribe({
      next: () => { this.showForm.set(false); this.load(); }
    });
  }

  updateStatus(enrollmentId: string, status: string) {
    this.adminService.updateEnrollment(enrollmentId, { status }).subscribe({
      next: () => this.load()
    });
  }

  update(field: string, value: string) { this.formData.update(d => ({ ...d, [field]: value })); }

  enrollStudent() { this.showForm.set(true); }
}
