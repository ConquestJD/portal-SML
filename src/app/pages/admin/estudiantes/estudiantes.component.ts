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
  selectedGrade = signal<string>('');
  searchQuery = signal('');
  filterSection = signal('todos');
  filterStatus = signal<'todos' | 'activo' | 'retirado' | 'suspendido'>('todos');

  students = signal<Student[]>([
    { id: '1', name: 'Juan Pérez', code: '2024001', email: 'juan@colegio.edu', grade: '3ro', section: 'A', status: 'activo', enrollmentDate: '2024-01-15' },
    { id: '2', name: 'María García', code: '2024002', email: 'maria@colegio.edu', grade: '2do', section: 'B', status: 'activo', enrollmentDate: '2024-01-16' },
    { id: '3', name: 'Carlos López', code: '2024003', email: 'carlos@colegio.edu', grade: '5to', section: 'C', status: 'activo', enrollmentDate: '2024-01-17' },
    { id: '4', name: 'Ana Martínez', code: '2024004', email: 'ana@colegio.edu', grade: '4to', section: 'A', status: 'retirado', enrollmentDate: '2024-01-18' },
    { id: '5', name: 'Pedro Ramírez', code: '2024005', email: 'pedro@colegio.edu', grade: '1ro', section: 'A', status: 'activo', enrollmentDate: '2024-02-01' },
    { id: '6', name: 'Sofía Torres', code: '2024006', email: 'sofia@colegio.edu', grade: '6to', section: 'B', status: 'activo', enrollmentDate: '2024-02-05' },
    { id: '7', name: 'Luis Fernández', code: '2024007', email: '', grade: '', section: '', status: 'activo', enrollmentDate: '2024-03-10' }
  ]);

  availableGrades = computed(() => {
    const grades = new Set(this.students().map(s => s.grade).filter(g => g));
    return Array.from(grades).sort();
  });

  filteredStudents = computed(() => {
    if (!this.selectedGrade()) {
      return [];
    }

    let result = this.students().filter(s => s.grade === this.selectedGrade());
    const query = this.searchQuery().toLowerCase();
    const section = this.filterSection();
    const status = this.filterStatus();

    if (query) {
      result = result.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query)
      );
    }

    if (section !== 'todos') {
      result = result.filter(s => s.section === section);
    }

    if (status !== 'todos') {
      result = result.filter(s => s.status === status);
    }

    return result;
  });

  selectGrade(grade: string) {
    this.selectedGrade.set(grade);
  }

  getStudentsCountByGrade(grade: string): number {
    return this.students().filter(s => s.grade === grade && s.status === 'activo').length;
  }
  importStudents() {
    console.log('Importar estudiantes desde Excel/CSV');
  }
}
