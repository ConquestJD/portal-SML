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

  profesores = signal<TeacherItem[]>([]);

  private _searchQuery = signal('');
  get searchQuery(): string { return this._searchQuery(); }
  set searchQuery(v: string) { this._searchQuery.set(v); }

  private _filterStatus = signal('');
  get filterStatus(): string { return this._filterStatus(); }
  set filterStatus(v: string) { this._filterStatus.set(v); }

  filteredProfesores = computed(() => {
    let list = this.profesores();
    const q = this._searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(p =>
        (p.name ?? `${p.user.firstName} ${p.user.lastName}`).toLowerCase().includes(q) ||
        (p.email ?? p.user.email).toLowerCase().includes(q)
      );
    }
    return list;
  });

  hasActiveFilters = computed(() => !!this._searchQuery() || !!this._filterStatus());

  clearSearch() { this._searchQuery.set(''); }

  resetFilters() {
    this._searchQuery.set('');
    if (this._filterStatus()) {
      this._filterStatus.set('');
      this.load();
    }
  }

  constructor(private adminService: AdminService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const statusMap: Record<string, string> = { activo: 'ACTIVE', inactivo: 'INACTIVE' };
    this.adminService.getTeachers({
      status: statusMap[this._filterStatus()] || undefined,
      page: 1,
      pageSize: 100
    }).subscribe({
      next: ({ data }) => {
        this.profesores.set(data);
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar profesores'); this.loading.set(false); }
    });
  }

  getFullName(p: TeacherItem): string { return p.name ?? `${p.user.firstName} ${p.user.lastName}`; }

  toggleStatus(p: TeacherItem) {
    const current = (p as { status?: string }).status ?? p.user?.status;
    const isActive = current === 'ACTIVE' || current === 'activo';
    const next = isActive ? 'INACTIVE' : 'ACTIVE';
    this.adminService.patchUserStatus(p.user?.id ?? p.id, next).subscribe({
      next: () => this.load(),
    });
  }
}
