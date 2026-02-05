import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface Course {
  id: string;
  code: string;
  name: string;
  teacher: string;
  teacherPhoto: string;
  average: number;
  pendingTasks: number;
  nextEvaluation: string;
  status: 'active' | 'finished';
}

@Component({
  selector: 'app-cursos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cursos.component.html',
  styleUrl: './cursos.component.css'
})
export class CursosComponent {
  viewMode = signal<'grid' | 'list'>('grid');
  filterPeriod = signal('2024');
  searchQuery = signal('');

  courses = signal<Course[]>([
    {
      id: '1',
      code: 'MAT-2024',
      name: 'Matemática',
      teacher: 'Prof. Carlos Rodríguez',
      teacherPhoto: 'https://via.placeholder.com/40',
      average: 16.5,
      pendingTasks: 2,
      nextEvaluation: '2024-03-25',
      status: 'active'
    },
    {
      id: '2',
      code: 'LEN-2024',
      name: 'Lengua y Literatura',
      teacher: 'Prof. María González',
      teacherPhoto: 'https://via.placeholder.com/40',
      average: 18.0,
      pendingTasks: 1,
      nextEvaluation: '2024-03-28',
      status: 'active'
    },
    {
      id: '3',
      code: 'CIE-2024',
      name: 'Ciencias',
      teacher: 'Prof. Ana Martínez',
      teacherPhoto: 'https://via.placeholder.com/40',
      average: 17.2,
      pendingTasks: 3,
      nextEvaluation: '2024-03-30',
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
        course.teacher.toLowerCase().includes(query)
      )
    );
  }
}
