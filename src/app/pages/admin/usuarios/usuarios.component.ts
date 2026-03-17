import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AdminService, UserItem } from '../../../services/admin.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css'
})
export class UsuariosComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  filterRole = signal('');
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);

  users = signal<UserItem[]>([]);
  activeTab = signal('todos');

  resetPasswordResult = signal<{ userId: string; tempPassword: string } | null>(null);

  // Plain properties for [(ngModel)] compatibility
  private _searchQuery = signal('');
  get searchQuery(): string { return this._searchQuery(); }
  set searchQuery(v: string) { this._searchQuery.set(v); }

  private _filterStatus = signal('');
  get filterStatus(): string { return this._filterStatus(); }
  set filterStatus(v: string) { this._filterStatus.set(v); }

  filteredUsers = computed(() => {
    const q = this._searchQuery().toLowerCase();
    if (!q) return this.users();
    return this.users().filter(u =>
      (u.name ?? `${u.firstName} ${u.lastName}`).toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  estudiantes = computed(() => this.users().filter(u => u.role?.name === 'STUDENT'));
  profesores = computed(() => this.users().filter(u => u.role?.name === 'TEACHER'));
  administrativos = computed(() => this.users().filter(u => u.role?.name === 'ADMIN'));
  currentUsers = computed(() => this.filteredUsers());

  private readonly roleTabMap: Record<string, string> = {
    estudiantes: 'STUDENT', profesores: 'TEACHER', administrativos: 'ADMIN'
  };
  private readonly statusApiMap: Record<string, string> = {
    activo: 'ACTIVE', inactivo: 'INACTIVE', suspendido: 'SUSPENDED'
  };

  constructor(private adminService: AdminService, private router: Router) {}

  navigateToEdit(user: UserItem) {
    this.router.navigate(['/admin/usuarios', user.id, 'editar'], { state: { user } });
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const statusFilter = this._filterStatus();
    this.adminService.getUsers({
      role: this.filterRole() || undefined,
      status: this.statusApiMap[statusFilter] || undefined,
      page: this.currentPage(),
      pageSize: 20
    }).subscribe({
      next: ({ data, meta }) => {
        this.users.set(data);
        this.totalPages.set(meta.totalPages);
        this.total.set(meta.total);
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar usuarios'); this.loading.set(false); }
    });
  }

  onFilterChange() { this.currentPage.set(1); this.load(); }

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

  setTab(t: string) {
    this.activeTab.set(t);
    this.filterRole.set(this.roleTabMap[t] ?? '');
    this.load();
  }
  onSearch() { this.onFilterChange(); }
  applyFilters() { this.onFilterChange(); }
}
