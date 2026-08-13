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
  total = signal(0);

  profesores = signal<TeacherItem[]>([]);

  private _searchQuery = signal('');
  get searchQuery(): string { return this._searchQuery(); }
  set searchQuery(v: string) { this._searchQuery.set(v); }

  private _filterSpecialty = signal('');
  get filterSpecialty(): string { return this._filterSpecialty(); }
  set filterSpecialty(v: string) { this._filterSpecialty.set(v); }

  private _filterStatus = signal('');
  get filterStatus(): string { return this._filterStatus(); }
  set filterStatus(v: string) { this._filterStatus.set(v); }

  availableSpecialties = computed(() =>
    Array.from(new Set(
      this.profesores().map(p => this.specialtyOf(p)).filter(s => s !== 'Sin especialidad')
    )).sort((a, b) => a.localeCompare(b, 'es'))
  );

  filteredProfesores = computed(() => {
    const specialty = this._filterSpecialty();
    const status = this._filterStatus();
    const q = this._searchQuery().trim().toLowerCase();

    return this.profesores().filter(p => {
      if (specialty && this.specialtyOf(p) !== specialty) return false;
      if (status === 'activo' && !this.isActive(p)) return false;
      if (status === 'inactivo' && this.isActive(p)) return false;
      if (q) {
        const text = [
          this.getFullName(p),
          p.email ?? p.user?.email ?? '',
          p.teacherCode ?? '',
          this.specialtyOf(p),
          p.phone ?? '',
        ].join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  });

  groupedProfesores = computed(() => {
    const groups = new Map<string, TeacherItem[]>();
    for (const p of this.filteredProfesores()) {
      const key = this.specialtyOf(p);
      const list = groups.get(key) ?? [];
      list.push(p);
      groups.set(key, list);
    }

    const keys = Array.from(groups.keys()).sort((a, b) => {
      if (a === 'Sin especialidad') return 1;
      if (b === 'Sin especialidad') return -1;
      return a.localeCompare(b, 'es');
    });

    return keys.map(specialty => ({
      specialty,
      teachers: (groups.get(specialty) ?? []).slice().sort((a, b) =>
        this.getFullName(a).localeCompare(this.getFullName(b), 'es')
      ),
    }));
  });

  totalActive = computed(() => this.profesores().filter(p => this.isActive(p)).length);

  totalCourses = computed(() =>
    this.profesores().reduce((acc, p) => acc + this.courseCount(p), 0),
  );

  hasActiveFilters = computed(() =>
    !!this._searchQuery() || !!this._filterSpecialty() || !!this._filterStatus()
  );

  constructor(private adminService: AdminService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminService.getTeachers({ page: 1, pageSize: 100 }).subscribe({
      next: ({ data, meta }) => {
        this.profesores.set(data.map(p => this.withCourseCount(p)));
        this.total.set(meta?.total ?? data.length);
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar profesores'); this.loading.set(false); }
    });
  }

  resetFilters() {
    this._searchQuery.set('');
    this._filterSpecialty.set('');
    this._filterStatus.set('');
  }

  getFullName(p: TeacherItem): string {
    return (p.name ?? `${p.user?.firstName ?? ''} ${p.user?.lastName ?? ''}`).trim() || '—';
  }

  getInitials(p: TeacherItem): string {
    const name = this.getFullName(p);
    if (!name || name === '—') return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  specialtyOf(p: TeacherItem): string {
    return (p.specialty || p.department || '').trim() || 'Sin especialidad';
  }

  teacherEmail(p: TeacherItem): string {
    return p.email || p.user?.email || '—';
  }

  courseCount(p: TeacherItem): number {
    if (typeof p.courses === 'number' && p.courses > 0) return p.courses;
    const assigns = (p as TeacherItem & { assignments?: unknown[] }).assignments;
    return Array.isArray(assigns) ? assigns.length : 0;
  }

  isActive(p: TeacherItem): boolean {
    const s = (p.status ?? p.user?.status ?? '').toLowerCase();
    return s === 'active' || s === 'activo';
  }

  private withCourseCount(p: TeacherItem): TeacherItem {
    return { ...p, courses: this.courseCount(p) };
  }
}
