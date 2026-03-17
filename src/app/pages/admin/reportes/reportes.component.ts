import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../services/admin.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css'
})
export class ReportesComponent {
  loading = signal(false);
  error = signal('');
  reportData = signal<unknown>(null);
  selectedType = signal('students');

  filters = signal({
    status: '', courseId: '', startDate: '', endDate: '',
    periodId: '', academicYearId: ''
  });

  reportTypes = signal([
    { id: 'students', value: 'students', label: 'Estudiantes' },
    { id: 'attendance', value: 'attendance', label: 'Asistencia' },
    { id: 'grades', value: 'grades', label: 'Calificaciones' },
    { id: 'enrollments', value: 'enrollments', label: 'Matrículas' },
    { id: 'teachers', value: 'teachers', label: 'Profesores' },
    { id: 'payments', value: 'payments', label: 'Pagos' }
  ]);

  constructor(private adminService: AdminService) {}

  generateReport() {
    this.loading.set(true);
    this.error.set('');
    const f = this.filters();
    const params: Record<string, string> = {};
    if (f.status) params['status'] = f.status;
    if (f.courseId) params['courseId'] = f.courseId;
    if (f.startDate) params['startDate'] = f.startDate;
    if (f.endDate) params['endDate'] = f.endDate;
    if (f.periodId) params['periodId'] = f.periodId;
    if (f.academicYearId) params['academicYearId'] = f.academicYearId;

    this.adminService.getReport(this.selectedType(), params).subscribe({
      next: (data) => { this.reportData.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al generar el reporte'); this.loading.set(false); }
    });
  }

  update(field: string, value: string) { this.filters.update(f => ({ ...f, [field]: value })); }
}
