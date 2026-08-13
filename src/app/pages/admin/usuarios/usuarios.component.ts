import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AdminService, UserItem } from '../../../services/admin.service';
import { ADMIN_SHARED } from '../_shared';

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
    const status = this._filterStatus();
    return this.users().filter(u => {
      if (status === 'activo' && !this.isActive(u)) return false;
      if (status === 'inactivo' && (this.isActive(u) || this.isSuspended(u))) return false;
      if (status === 'suspendido' && !this.isSuspended(u)) return false;
      if (q) {
        const name = (u.name ?? `${u.firstName} ${u.lastName}`).toLowerCase();
        const email = (u.email ?? '').toLowerCase();
        const username = (u.username ?? '').toLowerCase();
        if (!name.includes(q) && !email.includes(q) && !username.includes(q)) return false;
      }
      return true;
    });
  });

  totalActive = computed(() => this.users().filter(u => this.isActive(u)).length);

  hasActiveFilters = computed(() => !!this._searchQuery() || !!this._filterStatus());

  constructor(private adminService: AdminService, private router: Router) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminService.getUsers({ role: 'ADMIN', page: 1, pageSize: 100 }).subscribe({
      next: ({ data, meta }) => {
        this.users.set(data);
        this.total.set(meta.total);
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar administradores'); this.loading.set(false); }
    });
  }

  resetFilters() {
    this._searchQuery.set('');
    this._filterStatus.set('');
  }

  navigateToEdit(user: UserItem) {
    this.router.navigate(['/admin/administradores', user.id, 'editar'], { state: { user } });
  }

  resetPassword(userId: string) {
    this.adminService.resetUserPassword(userId).subscribe({
      next: (res) => this.resetPasswordResult.set({ userId, tempPassword: res.tempPassword })
    });
  }

  dismissResetResult() { this.resetPasswordResult.set(null); }

  getFullName(u: UserItem): string {
    return (u.name ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`).trim() || '—';
  }

  getInitials(u: UserItem): string {
    const name = this.getFullName(u);
    if (!name || name === '—') return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  isActive(u: UserItem): boolean {
    const s = (u.displayStatus ?? u.status ?? '').toLowerCase();
    return s === 'active' || s === 'activo';
  }

  isSuspended(u: UserItem): boolean {
    const s = (u.displayStatus ?? u.status ?? '').toLowerCase();
    return s === 'suspended' || s === 'suspendido';
  }
}
