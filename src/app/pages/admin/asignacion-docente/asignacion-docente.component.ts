import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, AssignmentItem, TeacherItem, CourseItem, SectionItem, AcademicYearItem } from '../../../services/admin.service';

@Component({
  selector: 'app-asignacion-docente',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './asignacion-docente.component.html',
  styleUrl: './asignacion-docente.component.css'
})
export class AsignacionDocenteComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  showForm = signal(false);

  assignments = signal<AssignmentItem[]>([]);
  teachers = signal<TeacherItem[]>([]);
  courses = signal<CourseItem[]>([]);
  sections = signal<SectionItem[]>([]);
  academicYears = signal<AcademicYearItem[]>([]);

  currentPage = signal(1);
  totalPages = signal(1);

  formData = signal({ teacherId: '', courseId: '', sectionId: '', academicYearId: '' });

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.adminService.getTeachers({ pageSize: 100 }).subscribe({ next: ({ data }) => this.teachers.set(data) });
    this.adminService.getCourses({ pageSize: 100 }).subscribe({ next: ({ data }) => this.courses.set(data) });
    this.adminService.getSections().subscribe({ next: ({ data }) => this.sections.set(data) });
    this.adminService.getAcademicYears().subscribe({ next: d => this.academicYears.set(d) });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.adminService.getTeacherAssignments({ page: this.currentPage(), pageSize: 20 }).subscribe({
      next: ({ data, meta }) => {
        this.assignments.set(data);
        this.totalPages.set(meta.totalPages);
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar asignaciones'); this.loading.set(false); }
    });
  }

  save() {
    this.adminService.createTeacherAssignment(this.formData()).subscribe({
      next: () => { this.showForm.set(false); this.load(); }
    });
  }

  deactivate(id: string) {
    this.adminService.updateTeacherAssignment(id, { isActive: false }).subscribe({
      next: () => this.load()
    });
  }

  delete(id: string) {
    if (!confirm('¿Eliminar asignación?')) return;
    this.adminService.deleteTeacherAssignment(id).subscribe({ next: () => this.load() });
  }

  assignTeacher() { this.showForm.set(true); }
  update(field: string, value: string) { this.formData.update(d => ({ ...d, [field]: value })); }
  getTeacherName(t: TeacherItem): string { return `${t.user.firstName} ${t.user.lastName}`; }
}
