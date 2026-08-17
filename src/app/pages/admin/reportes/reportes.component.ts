import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AdminService,
  AcademicYearItem,
  AcademicPeriod,
  SectionItem,
  ReportResult,
  ReportCell,
} from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';
import type { AdminTab } from '../_shared/components/tabs/admin-tabs.component';

type ReportType = 'students' | 'attendance' | 'grades' | 'enrollments' | 'teachers' | 'payments';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, ...ADMIN_SHARED],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css'
})
export class ReportesComponent implements OnInit {
  loading = signal(false);
  error = signal('');
  report = signal<ReportResult | null>(null);
  selectedType = signal<ReportType>('students');

  years = signal<AcademicYearItem[]>([]);
  periods = signal<AcademicPeriod[]>([]);
  sections = signal<SectionItem[]>([]);

  readonly tabs: AdminTab[] = [
    { id: 'students', label: 'Estudiantes' },
    { id: 'attendance', label: 'Asistencia' },
    { id: 'grades', label: 'Calificaciones' },
    { id: 'enrollments', label: 'Matrículas' },
    { id: 'teachers', label: 'Profesores' },
    { id: 'payments', label: 'Pensiones' },
  ];

  private _academicYearId = signal('');
  get academicYearId(): string { return this._academicYearId(); }
  set academicYearId(v: string) {
    this._academicYearId.set(v);
    this._periodId.set('');
    this.loadPeriods();
    this.generateReport();
  }

  private _grade = signal('');
  get grade(): string { return this._grade(); }
  set grade(v: string) { this._grade.set(v); this.generateReport(); }

  private _status = signal('');
  get status(): string { return this._status(); }
  set status(v: string) { this._status.set(v); this.generateReport(); }

  private _startDate = signal('');
  get startDate(): string { return this._startDate(); }
  set startDate(v: string) { this._startDate.set(v); }

  private _endDate = signal('');
  get endDate(): string { return this._endDate(); }
  set endDate(v: string) { this._endDate.set(v); }

  private _periodId = signal('');
  get periodId(): string { return this._periodId(); }
  set periodId(v: string) { this._periodId.set(v); this.generateReport(); }

  grades = computed(() => {
    const yearId = this._academicYearId();
    const names = this.sections()
      .filter(s => !yearId || s.academicYear?.id === yearId)
      .map(s => s.grade)
      .filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'es'));
  });

  rowCount = computed(() =>
    this.report()?.groups.reduce((sum, g) => sum + g.rows.length, 0) ?? 0
  );

  selectedYearName = computed(() =>
    this.years().find(y => y.id === this._academicYearId())?.name ?? this.report()?.academicYear ?? ''
  );

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    forkJoin({
      years: this.adminService.getAcademicYears(),
      sections: this.adminService.getSections(),
    }).subscribe({
      next: ({ years, sections }) => {
        this.years.set(years);
        this.sections.set(sections.data ?? []);
        const active = years.find(y => y.status === 'ACTIVE') ?? years[0];
        this._academicYearId.set(active?.id ?? '');
        this.loadPeriods();
        this.generateReport();
      },
      error: () => {
        this.error.set('No se pudieron cargar los filtros del reporte.');
        this.generateReport();
      },
    });
  }

  setTab(tab: string) {
    this.selectedType.set(tab as ReportType);
    this._status.set('');
    this._periodId.set('');
    this._startDate.set('');
    this._endDate.set('');
    this.report.set(null);
    if (tab === 'grades') this.loadPeriods();
    this.generateReport();
  }

  reportLabel(id: string): string {
    return this.tabs.find(t => t.id === id)?.label ?? id;
  }

  reportHint(): string {
    switch (this.selectedType()) {
      case 'students': return 'Padrón del año lectivo: matrícula, estado y grado.';
      case 'attendance': return 'Asistencia agregada por alumno en el rango elegido.';
      case 'grades': return 'Notas por curso y periodo, con promedio institucional.';
      case 'enrollments': return 'Matrículas y retiros del año, agrupados por grado.';
      case 'teachers': return 'Carga vigente: cursos, grados y alumnos a cargo.';
      case 'payments': return 'Pensiones del alumno: cobrado, pendiente, retraso y omitido.';
    }
  }

  showStatusFilter(): boolean {
    return ['students', 'enrollments', 'teachers', 'payments'].includes(this.selectedType());
  }

  showDateFilter(): boolean {
    return this.selectedType() === 'attendance';
  }

  showPeriodFilter(): boolean {
    return this.selectedType() === 'grades';
  }

  statusOptions(): { value: string; label: string }[] {
    switch (this.selectedType()) {
      case 'students':
        return [
          { value: 'ACTIVE', label: 'Activos' },
          { value: 'SUSPENDED', label: 'Suspendidos' },
          { value: 'WITHDRAWN', label: 'Retirados' },
        ];
      case 'enrollments':
        return [
          { value: 'ACTIVE', label: 'Matriculados' },
          { value: 'WITHDRAWN', label: 'Retiro anticipado' },
          { value: 'COMPLETED', label: 'Culminados' },
        ];
      case 'teachers':
        return [
          { value: 'ACTIVE', label: 'Activos' },
          { value: 'ON_LEAVE', label: 'De licencia' },
          { value: 'INACTIVE', label: 'Inactivos' },
        ];
      case 'payments':
        return [
          { value: 'PAID', label: 'Pagado' },
          { value: 'PENDING', label: 'Pendiente' },
          { value: 'OVERDUE', label: 'Retraso' },
          { value: 'CANCELLED', label: 'Omitido' },
        ];
      default:
        return [];
    }
  }

  metricAlert(label: string): boolean {
    const key = label.toLowerCase();
    return key.includes('retraso') || key.includes('falta') || key.includes('desaprob') || key.includes('suspend');
  }

  cell(row: Record<string, ReportCell>, key: string): ReportCell {
    return row[key] ?? '—';
  }

  rateWidth(value: ReportCell): string {
    const n = parseFloat(String(value).replace(',', '.'));
    if (!Number.isFinite(n)) return '0%';
    return `${Math.max(0, Math.min(100, n))}%`;
  }

  generateReport() {
    this.loading.set(true);
    this.error.set('');
    const params: Record<string, string> = {};
    if (this.academicYearId) params['academicYearId'] = this.academicYearId;
    if (this.grade) params['grade'] = this.grade;
    if (this.status) params['status'] = this.status;
    if (this.selectedType() === 'attendance') {
      if (this.startDate) params['startDate'] = this.startDate;
      if (this.endDate) params['endDate'] = this.endDate;
    }
    if (this.selectedType() === 'grades' && this.periodId) params['periodId'] = this.periodId;

    this.adminService.getReport(this.selectedType(), params).subscribe({
      next: (data) => {
        this.report.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo generar el reporte.');
        this.loading.set(false);
      },
    });
  }

  exportCsv() {
    const report = this.report();
    if (!report || typeof document === 'undefined') return;
    const escape = (value: ReportCell) => {
      const text = String(value ?? '');
      if (/[;"\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
      return text;
    };
    const lines = [report.columns.map(c => escape(c.label)).join(';')];
    for (const group of report.groups) {
      for (const row of group.rows) {
        lines.push(report.columns.map(c => escape(row[c.key] ?? '')).join(';'));
      }
    }
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.fileName(report.title, 'csv');
    a.click();
    URL.revokeObjectURL(url);
  }

  printReport() {
    if (typeof window === 'undefined') return;
    window.print();
  }

  private fileName(title: string, ext: string): string {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
    return `${slug || 'reporte'}.${ext}`;
  }

  private loadPeriods() {
    const yearId = this._academicYearId();
    if (!yearId) {
      this.periods.set([]);
      return;
    }
    this.adminService.getAcademicYearPeriods(yearId).subscribe({
      next: (data) => this.periods.set(data ?? []),
      error: () => this.periods.set([]),
    });
  }
}
