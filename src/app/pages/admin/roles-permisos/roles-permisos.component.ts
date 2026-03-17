import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, RoleItem } from '../../../services/admin.service';

@Component({
  selector: 'app-roles-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './roles-permisos.component.html',
  styleUrl: './roles-permisos.component.css'
})
export class RolesPermisosComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  saving = signal('');
  roles = signal<RoleItem[]>([]);

  allPermissions = [
    'read:users', 'create:users', 'update:users', 'delete:users',
    'read:students', 'create:students', 'update:students', 'delete:students',
    'read:teachers', 'create:teachers', 'update:teachers', 'delete:teachers',
    'read:parents', 'create:parents', 'update:parents',
    'read:courses', 'create:courses', 'update:courses', 'delete:courses',
    'read:announcements', 'create:announcements', 'update:announcements', 'delete:announcements',
    'read:reports', 'read:enrollments', 'create:enrollments', 'update:enrollments',
    'read:grades', 'create:grades', 'update:grades',
    'read:attendance', 'create:attendance',
    'read:messages', 'send:messages',
    'upload:files', 'download:files'
  ];

  constructor(private adminService: AdminService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminService.getRoles().subscribe({
      next: (data) => { this.roles.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar roles'); this.loading.set(false); }
    });
  }

  getRolePermissions(role: RoleItem): string[] {
    return role.permissions.map(p => p.permission.action);
  }

  hasPermission(role: RoleItem, perm: string): boolean {
    return this.getRolePermissions(role).includes(perm);
  }

  togglePermission(role: RoleItem, perm: string) {
    const current = this.getRolePermissions(role);
    const updated = current.includes(perm)
      ? current.filter(p => p !== perm)
      : [...current, perm];
    this.saving.set(role.id);
    this.adminService.updateRole(role.id, { permissions: updated }).subscribe({
      next: (updated) => {
        this.roles.update(list => list.map(r => r.id === updated.id ? updated : r));
        this.saving.set('');
      },
      error: () => this.saving.set('')
    });
  }
}
