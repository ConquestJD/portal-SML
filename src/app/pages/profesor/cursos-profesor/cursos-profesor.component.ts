import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TeacherService, TeacherCourse } from '../../../services/teacher.service';

@Component({
  selector: 'app-cursos-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cursos-profesor.component.html',
  styleUrl: './cursos-profesor.component.css'
})
export class CursosProfesorComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  searchQuery = signal('');
  filterPeriod = signal('');
  viewMode = signal<'grid' | 'list'>('grid');
  courses = signal<TeacherCourse[]>([]);

  filteredCourses = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.courses();
    return this.courses().filter(c =>
      c.course.name.toLowerCase().includes(q) ||
      (c.course.code ?? '').toLowerCase().includes(q)
    );
  });

  constructor(private teacherService: TeacherService) {}

  ngOnInit() {
    this.teacherService.getCourses().subscribe({
      next: (data) => { this.courses.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar cursos'); this.loading.set(false); }
    });
  }

  getCourseName(c: TeacherCourse): string { return c.course.name; }
  getGradeSection(c: TeacherCourse): string { return `${c.section.grade} - Sección ${c.section.name}`; }
  onSearch() { /* computed */ }
  toggleView() { this.viewMode.set(this.viewMode() === 'grid' ? 'list' : 'grid'); }
}
