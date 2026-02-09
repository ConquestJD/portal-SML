import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface Professor {
  id: string;
  name: string;
  email: string;
  status: 'activo' | 'inactivo';
  courses: number;
  students: number;
  department: string;
  grades: string[];
}

@Component({
  selector: 'app-profesores',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profesores.component.html',
  styleUrl: './profesores.component.css'
})
export class ProfesoresComponent {
  selectedGrade = signal<string>('');
  searchQuery = signal('');
  filterStatus = signal<'todos' | 'activo' | 'inactivo'>('todos');

  profesores = signal<Professor[]>([
    { id: '1', name: 'Prof. Ana Martínez', email: 'ana.martinez@colegio.edu', status: 'activo', courses: 2, students: 58, department: 'Matemática', grades: ['3ro', '4to'] },
    { id: '2', name: 'Prof. Luis Rodríguez', email: 'luis.rodriguez@colegio.edu', status: 'activo', courses: 3, students: 85, department: 'Lengua y Literatura', grades: ['3ro', '5to'] },
    { id: '3', name: 'Prof. María González', email: 'maria.gonzalez@colegio.edu', status: 'activo', courses: 2, students: 61, department: 'Ciencias', grades: ['2do', '4to'] },
    { id: '4', name: 'Prof. Carlos López', email: 'carlos.lopez@colegio.edu', status: 'activo', courses: 1, students: 30, department: 'Historia', grades: ['1ro'] }
  ]);

  availableGrades = computed(() => {
    const grades = new Set<string>();
    this.profesores().forEach(prof => {
      prof.grades.forEach(grade => {
        grades.add(grade);
      });
    });
    return Array.from(grades).sort();
  });

  filteredProfesores = computed(() => {
    if (!this.selectedGrade()) {
      return [];
    }

    let result = this.profesores().filter(p => {
      return p.grades.includes(this.selectedGrade());
    });

    const query = this.searchQuery().toLowerCase();
    const status = this.filterStatus();

    if (query) {
      result = result.filter(p => p.name.toLowerCase().includes(query) || p.email.toLowerCase().includes(query));
    }
    if (status !== 'todos') {
      result = result.filter(p => p.status === status);
    }

    return result;
  });

  selectGrade(grade: string) {
    this.selectedGrade.set(grade);
  }

  getProfessorsCountByGrade(grade: string): number {
    return this.profesores().filter(p => 
      p.status === 'activo' && 
      p.grades.includes(grade)
    ).length;
  }
}
