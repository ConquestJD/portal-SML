import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'estudiante' | 'profesor' | 'admin' | 'administrativo';
  status: 'activo' | 'inactivo' | 'suspendido';
  createdAt: string;
  lastLogin?: string;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css'
})
export class UsuariosComponent {
  activeTab = signal<'estudiantes' | 'profesores' | 'administrativos'>('estudiantes');
  searchQuery = signal('');
  filterStatus = signal<'todos' | 'activo' | 'inactivo' | 'suspendido'>('todos');

  estudiantes = signal<User[]>([
    { id: '1', name: 'Juan Pérez', email: 'juan@colegio.edu', role: 'estudiante', status: 'activo', createdAt: '2024-01-15', lastLogin: '2024-03-20' },
    { id: '2', name: 'María García', email: 'maria@colegio.edu', role: 'estudiante', status: 'activo', createdAt: '2024-01-16', lastLogin: '2024-03-20' },
    { id: '3', name: 'Carlos López', email: 'carlos@colegio.edu', role: 'estudiante', status: 'inactivo', createdAt: '2024-01-17' }
  ]);

  profesores = signal<User[]>([
    { id: '4', name: 'Prof. Ana Martínez', email: 'ana@colegio.edu', role: 'profesor', status: 'activo', createdAt: '2024-01-10', lastLogin: '2024-03-20' },
    { id: '5', name: 'Prof. Luis Rodríguez', email: 'luis@colegio.edu', role: 'profesor', status: 'activo', createdAt: '2024-01-11', lastLogin: '2024-03-19' }
  ]);

  administrativos = signal<User[]>([
    { id: '6', name: 'Admin Principal', email: 'admin@colegio.edu', role: 'admin', status: 'activo', createdAt: '2024-01-01', lastLogin: '2024-03-20' },
    { id: '7', name: 'Secretaria General', email: 'secretaria@colegio.edu', role: 'administrativo', status: 'activo', createdAt: '2024-01-05', lastLogin: '2024-03-20' }
  ]);

  currentUsers = signal<User[]>([]);

  constructor() {
    this.updateCurrentUsers();
  }

  setTab(tab: 'estudiantes' | 'profesores' | 'administrativos') {
    this.activeTab.set(tab);
    this.updateCurrentUsers();
  }

  updateCurrentUsers() {
    const tab = this.activeTab();
    if (tab === 'estudiantes') {
      this.currentUsers.set(this.estudiantes());
    } else if (tab === 'profesores') {
      this.currentUsers.set(this.profesores());
    } else {
      this.currentUsers.set(this.administrativos());
    }
    this.applyFilters();
  }

  onSearch() {
    this.applyFilters();
  }

  applyFilters() {
    let users = this.currentUsers();
    const query = this.searchQuery().toLowerCase();
    const status = this.filterStatus();

    if (query) {
      users = users.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }

    if (status !== 'todos') {
      users = users.filter(user => user.status === status);
    }

    this.currentUsers.set(users);
  }
}
