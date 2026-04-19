import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, TeacherItem } from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';

@Component({
  selector: 'app-profesores',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...ADMIN_SHARED],
  templateUrl: './profesores.component.html',
  styleUrl: './profesores.component.css'
})
export class ProfesoresComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);
  selectedGrade = signal('');

  profesores = signal<TeacherItem[]>([]);

  // Getter/setter pairs so [(ngModel)] works with signals
  private _searchQuery = signal('');
  get searchQuery(): string { return this._searchQuery(); }
  set searchQuery(v: string) { this._searchQuery.set(v); }

  private _filterStatus = signal('');
  get filterStatus(): string { return this._filterStatus(); }
  set filterStatus(v: string) { this._filterStatus.set(v); }

  // Unique departments derived from loaded teachers
  availableGrades = computed(() => {
    const deps = this.profesores()
      .map(p => p.department ?? p.specialty ?? '')
      .filter(d => !!d);
    return [...new Set(deps)].sort();
  });

  filteredProfesores = computed(() => {
    let list = this.profesores();
    const grade = this.selectedGrade();
    if (grade) {
      list = list.filter(p => (p.department ?? p.specialty ?? '') === grade);
    }
    const q = this._searchQuery().toLowerCase();
    if (q) {
      list = list.filter(p =>
        (p.name ?? `${p.user.firstName} ${p.user.lastName}`).toLowerCase().includes(q) ||
        (p.email ?? p.user.email).toLowerCase().includes(q) ||
        (p.department ?? p.specialty ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  });

  constructor(private adminService: AdminService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const statusMap: Record<string, string> = { activo: 'ACTIVE', inactivo: 'INACTIVE' };
    this.adminService.getTeachers({
      status: statusMap[this._filterStatus()] || undefined,
      page: this.currentPage(),
      pageSize: 100
    }).subscribe({
      next: ({ data, meta }) => {
        this.profesores.set(data);
        this.totalPages.set(meta.totalPages);
        this.total.set(meta.total);
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar profesores'); this.loading.set(false); }
    });
  }

  selectGrade(grade: string) { this.selectedGrade.set(grade); }

  getProfessorsCountByGrade(grade: string): number {
    return this.profesores().filter(p => (p.department ?? p.specialty ?? '') === grade).length;
  }

  getFullName(p: TeacherItem): string { return p.name ?? `${p.user.firstName} ${p.user.lastName}`; }

  toggleStatus(p: TeacherItem) {
    const current = (p as any).status ?? p.user?.status;
    const isActive = current === 'ACTIVE' || current === 'activo';
    const next = isActive ? 'INACTIVE' : 'ACTIVE';
    this.adminService.patchUserStatus(p.user?.id ?? p.id, next).subscribe({
      next: () => this.load(),
    });
  }
}
