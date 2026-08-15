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
  busyId = signal('');

  profesores = signal<TeacherItem[]>([]);

  private _searchQuery = signal('');
  get searchQuery(): string { return this._searchQuery(); }
  set searchQuery(v: string) { this._searchQuery.set(v); }

  private _filterStatus = signal('');
  get filterStatus(): string { return this._filterStatus(); }
  set filterStatus(v: string) { this._filterStatus.set(v); }

  filteredProfesores = computed(() => {
    const status = this._filterStatus();
    const q = this._searchQuery().trim().toLowerCase();

    return this.profesores()
      .filter(p => {
        if (status === 'activo' && !this.isActive(p)) return false;
        if (status === 'suspendido' && !this.isSuspended(p)) return false;
        if (status === 'inactivo' && (this.isActive(p) || this.isSuspended(p))) return false;
        if (q) {
          const text = [
            this.getFullName(p),
            p.email ?? p.user?.email ?? '',
            p.teacherCode ?? '',
            p.phone ?? '',
          ].join(' ').toLowerCase();
          if (!text.includes(q)) return false;
        }
        return true;
      })
      .slice()
      .sort((a, b) => this.getFullName(a).localeCompare(this.getFullName(b), 'es'));
  });

  totalActive = computed(() => this.profesores().filter(p => this.isActive(p)).length);

  totalCourses = computed(() =>
    this.profesores().reduce((acc, p) => acc + this.courseCount(p), 0),
  );

  hasActiveFilters = computed(() =>
    !!this._searchQuery() || !!this._filterStatus()
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

  isSuspended(p: TeacherItem): boolean {
    const s = (p.status ?? p.user?.status ?? '').toLowerCase();
    return s === 'suspended' || s === 'suspendido';
  }

  toggleSuspend(p: TeacherItem) {
    const userId = p.user?.id;
    if (!userId) {
      this.error.set('No se encontró la cuenta de este profesor.');
      return;
    }

    const next = this.isSuspended(p) ? 'ACTIVE' : 'SUSPENDED';
    const label = next === 'SUSPENDED' ? 'suspender' : 'reactivar';
    if (!confirm(`¿${label.charAt(0).toUpperCase() + label.slice(1)} la cuenta de ${this.getFullName(p)}?`)) return;

    this.error.set('');
    this.busyId.set(p.id);
    this.adminService.patchUserStatus(userId, next).subscribe({
      next: () => {
        this.profesores.update(list => list.map(t => {
          if (t.id !== p.id) return t;
          return {
            ...t,
            status: next,
            user: t.user ? { ...t.user, status: next } : t.user,
          };
        }));
        this.busyId.set('');
      },
      error: (err) => {
        this.error.set(this.extractApiMessage(err) || 'No se pudo actualizar el estado de la cuenta.');
        this.busyId.set('');
      }
    });
  }

  deleteTeacher(p: TeacherItem) {
    if (!confirm(`¿Eliminar la cuenta de ${this.getFullName(p)}? Dejará de aparecer en el claustro y no podrá ingresar.`)) return;
    this.error.set('');
    this.busyId.set(p.id);
    this.adminService.deleteTeacher(p.id).subscribe({
      next: () => {
        this.profesores.update(list => list.filter(t => t.id !== p.id));
        this.total.update(n => Math.max(0, n - 1));
        this.busyId.set('');
      },
      error: (err) => {
        this.error.set(this.extractApiMessage(err) || 'No se pudo eliminar la cuenta.');
        this.busyId.set('');
      }
    });
  }

  private withCourseCount(p: TeacherItem): TeacherItem {
    return { ...p, courses: this.courseCount(p) };
  }

  private extractApiMessage(err: unknown): string {
    const e = err as { error?: { error?: { message?: unknown }; message?: unknown }; message?: unknown };
    const raw = e?.error?.error?.message ?? e?.error?.message ?? e?.message;
    if (Array.isArray(raw)) return raw.join(', ');
    return typeof raw === 'string' ? raw : '';
  }
}
