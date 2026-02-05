import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface Course {
  id: string;
  code: string;
  name: string;
  grade: string;
  section: string;
  students: number;
  pendingGrading: number;
  averageGrade: number;
  status: 'active' | 'finished';
}

@Component({
  selector: 'app-cursos-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cursos-profesor.component.html',
  styleUrl: './cursos-profesor.component.css'
})
export class CursosProfesorComponent {
  viewMode = signal<'grid' | 'list'>('grid');
  filterPeriod = signal('2024');
  searchQuery = signal('');

  courses = signal<Course[]>([
    {
      id: '1',
      code: 'MAT-2024',
      name: 'Matemática',
      grade: '3ro',
      section: 'A',
      students: 30,
      pendingGrading: 5,
      averageGrade: 16.5,
      status: 'active'
    },
    {
      id: '2',
      code: 'MAT-2024',
      name: 'Matemática',
      grade: '3ro',
      section: 'B',
      students: 28,
      pendingGrading: 3,
      averageGrade: 17.2,
      status: 'active'
    },
    {
      id: '3',
      code: 'MAT-2024',
      name: 'Matemática',
      grade: '4to',
      section: 'A',
      students: 32,
      pendingGrading: 8,
      averageGrade: 15.8,
      status: 'active'
    }
  ]);

  filteredCourses = signal<Course[]>(this.courses());

  toggleView() {
    this.viewMode.update(mode => mode === 'grid' ? 'list' : 'grid');
  }

  onSearch() {
    const query = this.searchQuery().toLowerCase();
    if (!query) {
      this.filteredCourses.set(this.courses());
      return;
    }
    this.filteredCourses.set(
      this.courses().filter(course =>
        course.name.toLowerCase().includes(query) ||
        course.code.toLowerCase().includes(query) ||
        course.grade.toLowerCase().includes(query) ||
        course.section.toLowerCase().includes(query)
      )
    );
  }
}
