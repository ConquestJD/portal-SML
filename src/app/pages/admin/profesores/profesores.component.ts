import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-profesores',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profesores.component.html',
  styleUrl: './profesores.component.css'
})
export class ProfesoresComponent {
  searchQuery = signal('');
  filterStatus = signal<'todos' | 'activo' | 'inactivo'>('todos');

  profesores = signal([
    { id: '1', name: 'Prof. Ana Martínez', email: 'ana.martinez@colegio.edu', status: 'activo', courses: 2, students: 58, department: 'Matemática' },
    { id: '2', name: 'Prof. Luis Rodríguez', email: 'luis.rodriguez@colegio.edu', status: 'activo', courses: 3, students: 85, department: 'Lengua y Literatura' },
    { id: '3', name: 'Prof. María González', email: 'maria.gonzalez@colegio.edu', status: 'activo', courses: 2, students: 61, department: 'Ciencias' },
    { id: '4', name: 'Prof. Carlos López', email: 'carlos.lopez@colegio.edu', status: 'activo', courses: 1, students: 30, department: 'Historia' }
  ]);

  filteredProfesores = signal(this.profesores());

  onSearch() {
    const query = this.searchQuery().toLowerCase();
    const status = this.filterStatus();
    let result = this.profesores();

    if (query) {
      result = result.filter(p => p.name.toLowerCase().includes(query) || p.email.toLowerCase().includes(query));
    }
    if (status !== 'todos') {
      result = result.filter(p => p.status === status);
    }
    this.filteredProfesores.set(result);
  }
}
