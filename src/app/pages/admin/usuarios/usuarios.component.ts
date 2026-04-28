import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AdminService, UserItem } from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';

/**
 * Vista de "Administradores": gestiona únicamente usuarios con rol ADMIN.
 * (El listado completo de cada rol vive en sus propias páginas: estudiantes, profesores, padres.)
 */
@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...ADMIN_SHARED],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css'
})
export class UsuariosComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  total = signal(0);

  users = signal<UserItem[]>([]);
  resetPasswordResult = signal<{ userId: string; tempPassword: string } | null>(null);

  private _searchQuery = signal('');
  get searchQuery(): string { return this._searchQuery(); }
  set searchQuery(v: string) { this._searchQuery.set(v); }

  private _filterStatus = signal('');
  get filterStatus(): string { return this._filterStatus(); }
  set filterStatus(v: string) { this._filterStatus.set(v); }

  filteredUsers = computed(() => {
    const q = this._searchQuery().toLowerCase().trim();
    const list = this.users();
    if (!q) return list;
    return list.filter(u => {
      const name = (u.name ?? `${u.firstName} ${u.lastName}`).toLowerCase();
      const email = (u.email ?? '').toLowerCase();
      const username = (u.username ?? '').toLowerCase();
      return name.includes(q) || email.includes(q) || username.includes(q);
    });
  });

  totalActive = computed(() =>
    this.users().filter(u => u.status === 'ACTIVE' || u.displayStatus === 'activo').length
  );

  hasActiveFilters = computed(() => !!this._searchQuery() || !!this._filterStatus());

  resetFilters() {
    this._searchQuery.set('');
    if (this._filterStatus()) {
      this._filterStatus.set('');
      this.load();
    }
  }

  private readonly statusApiMap: Record<string, string> = {
    activo: 'ACTIVE', inactivo: 'INACTIVE', suspendido: 'SUSPENDED'
  };

  constructor(private adminService: AdminService, private router: Router) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminService.getUsers({
      role: 'ADMIN',
      status: this.statusApiMap[this._filterStatus()] || undefined,
      page: 1,
      pageSize: 100,
    }).subscribe({
      next: ({ data, meta }) => {
        this.users.set(data);
        this.total.set(meta.total);
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar administradores'); this.loading.set(false); }
    });
  }

  onFilterChange() { this.load(); }

  navigateToEdit(user: UserItem) {
    this.router.navigate(['/admin/administradores', user.id, 'editar'], { state: { user } });
  }

  toggleStatus(user: UserItem) {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.adminService.patchUserStatus(user.id, newStatus).subscribe({
      next: () => this.load()
    });
  }

  resetPassword(userId: string) {
    this.adminService.resetUserPassword(userId).subscribe({
      next: (res) => this.resetPasswordResult.set({ userId, tempPassword: res.tempPassword })
    });
  }

  dismissResetResult() { this.resetPasswordResult.set(null); }

  clearSearch() { this._searchQuery.set(''); }

  getInitials(u: UserItem): string {
    const name = (u.name ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`).trim();
    if (!name) return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
}
