import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, AcademicYearItem, CreateAcademicYearDto } from '../../../services/admin.service';

@Component({
  selector: 'app-anio-academico',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './anio-academico.component.html',
  styleUrl: './anio-academico.component.css'
})
export class AnioAcademicoComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  showForm = signal(false);
  editId = signal('');

  academicYears = signal<AcademicYearItem[]>([]);
  selectedYearPeriods = signal<unknown[]>([]);

  formData = signal<CreateAcademicYearDto>({
    name: '', startDate: '', endDate: '', status: 'UPCOMING'
  });

  constructor(private adminService: AdminService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminService.getAcademicYears().subscribe({
      next: (data) => { this.academicYears.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar años académicos'); this.loading.set(false); }
    });
  }

  save() {
    const obs = this.editId()
      ? this.adminService.updateAcademicYear(this.editId(), this.formData())
      : this.adminService.createAcademicYear(this.formData());
    obs.subscribe({ next: () => { this.showForm.set(false); this.editId.set(''); this.load(); } });
  }

  editYear(y: AcademicYearItem) {
    this.editId.set(y.id);
    this.formData.set({ name: y.name, startDate: y.startDate, endDate: y.endDate, status: y.status });
    this.showForm.set(true);
  }

  loadPeriods(yearId: string) {
    this.adminService.getAcademicYearPeriods(yearId).subscribe({
      next: (data) => this.selectedYearPeriods.set(data)
    });
  }

  createNewYear() { this.formData.set({ name: '', startDate: '', endDate: '', status: 'UPCOMING' }); this.showForm.set(true); this.editId.set(''); }
  cancelForm() { this.showForm.set(false); this.editId.set(''); }
  update(field: string, value: string) { this.formData.update(d => ({ ...d, [field]: value })); }
}
