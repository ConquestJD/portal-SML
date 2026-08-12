import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdminService,
  AcademicYearItem,
  AcademicPeriod,
  CreateAcademicYearDto,
} from '../../../services/admin.service';

@Component({
  selector: 'app-anio-academico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './anio-academico.component.html',
  styleUrl: './anio-academico.component.css'
})
export class AnioAcademicoComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  showForm = signal(false);
  editId = signal('');

  academicYears = signal<AcademicYearItem[]>([]);
  expandedYearId = signal('');
  periodsLoadingId = signal('');
  periodsByYearId = signal<Record<string, AcademicPeriod[]>>({});

  formData = signal<CreateAcademicYearDto>({
    name: '', startDate: '', endDate: '', status: 'UPCOMING'
  });

  activeYearsCount = computed(() =>
    this.academicYears().filter(y => this.statusKey(y.status) === 'active').length
  );

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
    this.periodsLoadingId.set(yearId);
    this.adminService.getAcademicYearPeriods(yearId).subscribe({
      next: (data) => {
        this.periodsByYearId.update(m => ({ ...m, [yearId]: data }));
        this.periodsLoadingId.set('');
      },
      error: () => {
        this.periodsByYearId.update(m => ({ ...m, [yearId]: [] }));
        this.periodsLoadingId.set('');
      }
    });
  }

  togglePeriods(yearId: string) {
    if (this.expandedYearId() === yearId) {
      this.expandedYearId.set('');
      return;
    }
    this.expandedYearId.set(yearId);
    if (!(yearId in this.periodsByYearId())) {
      this.loadPeriods(yearId);
    }
  }

  periodsFor(yearId: string): AcademicPeriod[] {
    return this.periodsByYearId()[yearId] ?? [];
  }

  statusKey(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'ACTIVE' || s === 'ACTIVO') return 'active';
    if (s === 'UPCOMING' || s === 'PROXIMO' || s === 'PRÓXIMO') return 'upcoming';
    return 'closed';
  }

  statusLabel(status: string): string {
    const key = this.statusKey(status);
    if (key === 'active') return 'Activo';
    if (key === 'upcoming') return 'Próximo';
    return 'Cerrado';
  }

  createNewYear() {
    this.formData.set({ name: '', startDate: '', endDate: '', status: 'UPCOMING' });
    this.showForm.set(true);
    this.editId.set('');
  }

  cancelForm() { this.showForm.set(false); this.editId.set(''); }

  update(field: string, value: string) {
    this.formData.update(d => ({ ...d, [field]: value }));
  }
}
