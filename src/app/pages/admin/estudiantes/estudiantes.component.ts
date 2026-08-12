import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, StudentItem } from '../../../services/admin.service';
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

  private _searchQuery = signal('');
  get searchQuery(): string { return this._searchQuery(); }
  set searchQuery(v: string) { this._searchQuery.set(v); }

  private _filterGrade = signal('');
  get filterGrade(): string { return this._filterGrade(); }
  set filterGrade(v: string) { this._filterGrade.set(v); }

  private _filterLevel = signal('');
  get filterLevel(): string { return this._filterLevel(); }
  set filterLevel(v: string) { this._filterLevel.set(v); }

  private _filterStatus = signal('');
  get filterStatus(): string { return this._filterStatus(); }
  set filterStatus(v: string) { this._filterStatus.set(v); }

  /** Lista única de grados a partir de los estudiantes cargados. */
  availableGrades = computed(() =>
    Array.from(new Set(this.students().map(s => s.grade ?? '').filter(Boolean))).sort()
  );

  availableLevels = computed(() =>
    Array.from(new Set(this.students().map(s => (s.level ?? '').toLowerCase()).filter(Boolean))).sort()
  );

  filteredStudents = computed(() => {
    const grade = this._filterGrade();
    const level = this._filterLevel();
    const status = this._filterStatus();
    const q = this._searchQuery().trim().toLowerCase();

    return this.students().filter(s => {
      if (grade && s.grade !== grade) return false;
      if (level && (s.level ?? '').toLowerCase() !== level) return false;
      if (status && s.status !== status) return false;
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
      const key = (s.grade ?? '').trim() || 'Sin matrícula';
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

  totalActive = computed(() => this.students().filter(s => s.status === 'activo').length);
  totalEnrolled = computed(() => this.students().filter(s => !!s.grade).length);

  hasActiveFilters = computed(() =>
    !!this._searchQuery() || !!this._filterGrade() || !!this._filterLevel() || !!this._filterStatus()
  );

  constructor(private adminService: AdminService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminService.getStudents({ page: 1, pageSize: 100 }).subscribe({
      next: ({ data, meta }) => {
        this.students.set(data);
        this.total.set(meta.total);
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
