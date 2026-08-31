import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AssignmentItem, TeacherItem, CourseItem, SectionItem, AcademicYearItem, activeAcademicYear } from '../../../services/admin.service';
import { AdminTeacherSearchComboboxComponent } from '../_shared/components/teacher-search-combobox/admin-teacher-search-combobox.component';

@Component({
  selector: 'app-asignacion-docente',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminTeacherSearchComboboxComponent],
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
    this.reloadLookups();
    this.load();
  }

  reloadLookups() {
    this.adminService.getTeachers({ pageSize: 100 }).subscribe({ next: ({ data }) => this.teachers.set(data) });
    this.adminService.getCourses({ pageSize: 100 }).subscribe({ next: ({ data }) => this.courses.set(data) });
    this.adminService.getAcademicYears().subscribe({
      next: (d) => {
        this.academicYears.set(d);
        const yearId = activeAcademicYear(d)?.id;
        this.adminService.getSections({ academicYearId: yearId }).subscribe({ next: ({ data }) => this.sections.set(data) });
      },
    });
  }

  load() {
    this.loading.set(true);
    this.adminService.getTeacherAssignments({ page: this.currentPage(), pageSize: 20 }).subscribe({
      next: ({ data, meta }) => {
        this.assignments.set(data);
        this.totalPages.set(meta.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar asignaciones');
        this.loading.set(false);
      },
    });
  }

  teacherDisplay(a: AssignmentItem): string {
    const fn = a.teacher?.user?.firstName ?? '';
    const ln = a.teacher?.user?.lastName ?? '';
    return `${fn} ${ln}`.trim() || '(sin nombre)';
  }

  sectionDisplay(a: AssignmentItem): string {
    return a.section?.name ?? '—';
  }

  gradeDisplay(a: AssignmentItem): string {
    return (a as { grade?: string }).grade ?? a.section?.grade ?? '—';
  }

  save() {
    const d = this.formData();
    if (!d.teacherId || !d.courseId || !d.sectionId || !d.academicYearId) return;
    this.adminService.createTeacherAssignment(d).subscribe({
      next: () => {
        this.showForm.set(false);
        this.formData.set({ teacherId: '', courseId: '', sectionId: '', academicYearId: '' });
        this.load();
      },
    });
  }

  deactivate(id: string) {
    this.adminService.updateTeacherAssignment(id, { isActive: false }).subscribe({ next: () => this.load() });
  }

  delete(id: string) {
    if (!confirm('¿Eliminar asignación?')) return;
    this.adminService.deleteTeacherAssignment(id).subscribe({ next: () => this.load() });
  }

  assignTeacher() {
    const years = this.academicYears();
    const active = activeAcademicYear(years);
    this.formData.set({
      teacherId: '',
      courseId: '',
      sectionId: '',
      academicYearId: active?.id ?? ''
    });
    this.showForm.set(true);
  }

  cancelForm() {
    this.showForm.set(false);
  }

  update(field: string, value: string) {
    this.formData.update(fd => ({ ...fd, [field]: value } as typeof fd));
  }
}
