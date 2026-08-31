import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, StudentItem, AcademicYearItem } from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';

@Component({
  selector: 'app-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...ADMIN_SHARED],
  templateUrl: './estudiantes.component.html',
  styleUrl: './estudiantes.component.css'
})
export class EstudiantesComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  total = signal(0);

  students = signal<StudentItem[]>([]);
  years = signal<AcademicYearItem[]>([]);
  selectedYearId = signal('');
  academicYearName = signal('2026');

  private _searchQuery = signal('');
  get searchQuery(): string { return this._searchQuery(); }
  set searchQuery(v: string) { this._searchQuery.set(v); }

  private _filterGrade = signal('');
  get filterGrade(): string { return this._filterGrade(); }
  set filterGrade(v: string) { this._filterGrade.set(v); }

  private _filterLevel = signal('');
  get filterLevel(): string { return this._filterLevel(); }
  set filterLevel(v: string) { this._filterLevel.set(v); }

  private _filterEnrollment = signal('');
  get filterEnrollment(): string { return this._filterEnrollment(); }
  set filterEnrollment(v: string) { this._filterEnrollment.set(v); }

  private _filterTuition = signal('');
  get filterTuition(): string { return this._filterTuition(); }
  set filterTuition(v: string) { this._filterTuition.set(v); }

  private _filterStatus = signal('');
  get filterStatus(): string { return this._filterStatus(); }
  set filterStatus(v: string) { this._filterStatus.set(v); }

  get filterYear(): string { return this.selectedYearId(); }
  set filterYear(v: string) {
    if (v === this.selectedYearId()) return;
    this.onYearChange(v);
  }

  availableGrades = computed(() =>
    Array.from(new Set(this.students().map(s => s.grade ?? '').filter(Boolean))).sort()
  );

  availableLevels = computed(() =>
    Array.from(new Set(this.students().map(s => (s.level ?? '').toLowerCase()).filter(Boolean))).sort()
  );

  filteredStudents = computed(() => {
    const grade = this._filterGrade();
    const level = this._filterLevel();
    const enroll = this._filterEnrollment();
    const tuition = this._filterTuition();
    const status = this._filterStatus();
    const q = this._searchQuery().trim().toLowerCase();

    return this.students().filter(s => {
      if (grade && s.grade !== grade) return false;
      if (level && (s.level ?? '').toLowerCase() !== level) return false;
      if (status && s.status !== status) return false;
      if (enroll === 'matriculado' && s.enrollmentKind !== 'active' && s.enrollmentKind !== 'late') return false;
      if (enroll === 'sin' && s.enrollmentKind !== 'none') return false;
      if (enroll === 'retirado' && s.enrollmentKind !== 'withdrawn') return false;
      if (tuition === 'atrasado' && !this.hasOverdue(s)) return false;
      if (tuition === 'aldia' && (this.hasOverdue(s) || s.enrollmentKind === 'none')) return false;
      if (q) {
        const text = `${s.name ?? ''} ${s.code ?? ''} ${s.email ?? ''} ${s.dni ?? ''} ${s.phone ?? ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  });

  private readonly gradeOrder = [
    '3 años', '4 años', '5 años',
    '1ro Primaria', '2do Primaria', '3ro Primaria', '4to Primaria', '5to Primaria', '6to Primaria',
    '1ro Secundaria', '2do Secundaria', '3ro Secundaria', '4to Secundaria', '5to Secundaria',
  ];

  groupedStudents = computed(() => {
    const groups = new Map<string, StudentItem[]>();
    for (const s of this.filteredStudents()) {
      const key = s.enrollmentKind === 'none' ? 'Sin matrícula' : ((s.grade ?? '').trim() || 'Sin matrícula');
      const list = groups.get(key) ?? [];
      list.push(s);
      groups.set(key, list);
    }

    const keys = Array.from(groups.keys()).sort((a, b) => this.compareGrades(a, b));
    return keys.map(grade => {
      const students = groups.get(grade) ?? [];
      return {
        grade,
        level: students.find(s => !!s.level)?.level ?? '',
        students,
      };
    });
  });

  totalEnrolled = computed(() =>
    this.students().filter(s => s.enrollmentKind === 'active' || s.enrollmentKind === 'late').length
  );
  totalOverdue = computed(() => this.students().filter(s => this.hasOverdue(s)).length);
  totalOnTime = computed(() =>
    this.students().filter(s =>
      (s.enrollmentKind === 'active' || s.enrollmentKind === 'late') && !this.hasOverdue(s)
    ).length
  );

  hasActiveFilters = computed(() =>
    !!this._searchQuery() || !!this._filterGrade() || !!this._filterLevel()
    || !!this._filterStatus() || !!this._filterEnrollment() || !!this._filterTuition()
  );

  constructor(private adminService: AdminService) {}

  busyId = signal('');
  suspendTarget = signal<StudentItem | null>(null);
  suspendReason = '';

  ngOnInit() {
    this.adminService.getAcademicYears().subscribe({
      next: (years) => {
        this.years.set(years ?? []);
        const active = (years ?? []).find(y => y.status === 'ACTIVE') ?? (years ?? [])[0];
        if (active) {
          this.selectedYearId.set(active.id);
          this.academicYearName.set(active.name);
        }
        this.load();
      },
      error: () => this.load()
    });
  }

  onYearChange(id: string) {
    this.selectedYearId.set(id);
    const year = this.years().find(y => y.id === id);
    this.academicYearName.set(year?.name ?? this.academicYearName());
    this.load();
  }

  load() {
    this.loading.set(true);
    this.adminService.getStudents({
      page: 1,
      pageSize: 100,
      academicYearId: this.selectedYearId() || undefined,
    }).subscribe({
      next: ({ data, meta }) => {
        this.students.set(data);
        this.total.set(meta.total);
        if (meta.academicYear?.name) this.academicYearName.set(meta.academicYear.name);
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar estudiantes'); this.loading.set(false); }
    });
  }

  clearSearch() { this._searchQuery.set(''); }

  resetFilters() {
    this._searchQuery.set('');
    this._filterGrade.set('');
    this._filterLevel.set('');
    this._filterStatus.set('');
    this._filterEnrollment.set('');
    this._filterTuition.set('');
  }

  getInitials(s: StudentItem): string {
    const name = (s.name ?? '').trim();
    if (!name) return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  studentCode(s: StudentItem): string {
    return s.code || s.studentCode || s.username || '—';
  }

  enrollmentLabel(s: StudentItem): string {
    if (s.enrollmentKind === 'active' || s.enrollmentKind === 'late') return 'Sí';
    if (s.enrollmentKind === 'withdrawn') return 'No';
    return 'No';
  }

  enrollmentKind(s: StudentItem): 'active' | 'none' {
    return s.enrollmentKind === 'active' || s.enrollmentKind === 'late' ? 'active' : 'none';
  }

  hasOverdue(s: StudentItem): boolean {
    return (s.tuition?.overdueCount ?? 0) > 0;
  }

  tuitionKind(s: StudentItem): 'overdue' | 'ok' | 'none' {
    if (this.hasOverdue(s)) return 'overdue';
    if (s.enrollmentKind === 'active' || s.enrollmentKind === 'late') return 'ok';
    return 'none';
  }

  tuitionLabel(s: StudentItem): string {
    if (this.hasOverdue(s)) {
      const months = s.tuition?.overdueMonths ?? [];
      return months.length ? `Retraso: ${months.join(', ')}` : 'Retraso';
    }
    if (s.enrollmentKind === 'active' || s.enrollmentKind === 'late') return 'Al día';
    return '—';
  }

  isSuspended(s: StudentItem): boolean {
    return s.status === 'suspendido' || s.status === 'SUSPENDED';
  }

  toggleSuspend(s: StudentItem) {
    if (this.isSuspended(s)) {
      if (!confirm(`¿Reactivar la cuenta de ${s.name || 'este alumno'}? Volverá a quedar matriculado en el año vigente.`)) return;
      this.patchStatus(s, 'ACTIVE');
      return;
    }
    this.suspendTarget.set(s);
    this.suspendReason = '';
  }

  closeSuspendModal() {
    this.suspendTarget.set(null);
    this.suspendReason = '';
  }

  deleteStudent(s: StudentItem) {
    const name = s.name || 'este alumno';
    if (!confirm(`¿Eliminar a ${name} de la base de datos? Se borrarán su cuenta, matrícula y registros. Esta acción no se puede deshacer.`)) {
      return;
    }
    this.error.set('');
    this.busyId.set(s.id);
    this.adminService.deleteStudent(s.id).subscribe({
      next: () => {
        this.students.update((list) => list.filter((row) => row.id !== s.id));
        this.total.update((n) => Math.max(0, n - 1));
        this.busyId.set('');
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'No se pudo eliminar al alumno.');
        this.busyId.set('');
      },
    });
  }

  confirmSuspend() {
    const s = this.suspendTarget();
    const reason = this.suspendReason.trim();
    if (!s) return;
    if (reason.length < 3) {
      this.error.set('Indica el motivo de la suspensión.');
      return;
    }
    this.patchStatus(s, 'SUSPENDED', reason);
  }

  private patchStatus(s: StudentItem, next: 'ACTIVE' | 'SUSPENDED', reason?: string) {
    this.error.set('');
    this.busyId.set(s.id);
    this.adminService.patchStudentAccountStatus(s.id, next, reason).subscribe({
      next: (updated) => {
        this.students.update(list => list.map(row => row.id === s.id ? { ...row, ...updated, tuition: row.tuition } : row));
        this.busyId.set('');
        this.closeSuspendModal();
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'No se pudo actualizar la cuenta.');
        this.busyId.set('');
      }
    });
  }

  private compareGrades(a: string, b: string): number {
    if (a === 'Sin matrícula') return 1;
    if (b === 'Sin matrícula') return -1;
    const ia = this.gradeOrder.indexOf(a);
    const ib = this.gradeOrder.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'es');
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  }

  importStudents() {
    alert('Importación masiva no disponible en esta versión');
  }
}
