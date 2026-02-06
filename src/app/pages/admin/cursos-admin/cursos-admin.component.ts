import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Component for admin course management

@Component({
  selector: 'app-cursos-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cursos-admin.component.html',
  styleUrl: './cursos-admin.component.css'
})
export class CursosAdminComponent {
  searchQuery = signal('');
  filterGrade = signal('todos');
  filterStatus = signal<'todos' | 'activo' | 'inactivo'>('todos');

  courses = signal([
    { id: '1', code: 'MAT-2024', name: 'Matemática', grade: '3ro', status: 'activo', students: 90 },
    { id: '2', code: 'LEN-2024', name: 'Lengua y Literatura', grade: '3ro', status: 'activo', students: 90 }
  ]);

  filteredCourses = signal(this.courses());

  onSearch() {
    const query = this.searchQuery().toLowerCase();
    const grade = this.filterGrade();
    const status = this.filterStatus();
    let result = this.courses();

    if (query) {
      result = result.filter(c => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query));
    }
    if (grade !== 'todos') {
      result = result.filter(c => c.grade === grade);
    }
    if (status !== 'todos') {
      result = result.filter(c => c.status === status);
    }
    this.filteredCourses.set(result);
  }
}
