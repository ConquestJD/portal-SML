import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface Student {
  id: string;
  name: string;
  code: string;
  email: string;
  grade: string;
  section: string;
  status: 'activo' | 'retirado' | 'suspendido';
  enrollmentDate: string;
}

@Component({
  selector: 'app-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './estudiantes.component.html',
  styleUrl: './estudiantes.component.css'
})
export class EstudiantesComponent {
  searchQuery = signal('');
  filterGrade = signal('todos');
  filterSection = signal('todos');
  filterStatus = signal<'todos' | 'activo' | 'retirado' | 'suspendido'>('todos');

  students = signal<Student[]>([
    { id: '1', name: 'Juan Pérez', code: '2024001', email: 'juan@colegio.edu', grade: '3ro', section: 'A', status: 'activo', enrollmentDate: '2024-01-15' },
    { id: '2', name: 'María García', code: '2024002', email: 'maria@colegio.edu', grade: '3ro', section: 'A', status: 'activo', enrollmentDate: '2024-01-16' },
    { id: '3', name: 'Carlos López', code: '2024003', email: 'carlos@colegio.edu', grade: '3ro', section: 'B', status: 'activo', enrollmentDate: '2024-01-17' },
    { id: '4', name: 'Ana Martínez', code: '2024004', email: 'ana@colegio.edu', grade: '4to', section: 'A', status: 'retirado', enrollmentDate: '2024-01-18' }
  ]);

  filteredStudents = computed(() => {
    let result = this.students();
    const query = this.searchQuery().toLowerCase();
    const grade = this.filterGrade();
    const section = this.filterSection();
    const status = this.filterStatus();

    if (query) {
      result = result.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query)
      );
    }

    if (grade !== 'todos') {
      result = result.filter(s => s.grade === grade);
    }

    if (section !== 'todos') {
      result = result.filter(s => s.section === section);
    }

    if (status !== 'todos') {
      result = result.filter(s => s.status === status);
    }

    return result;
  });

  onSearch() {}
  onFilterChange() {}
  importStudents() {
    console.log('Importar estudiantes desde Excel/CSV');
  }
}
