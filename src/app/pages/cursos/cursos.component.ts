import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentService, StudentCourse } from '../../services/student.service';

@Component({
  selector: 'app-cursos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cursos.component.html',
  styleUrl: './cursos.component.css'
})
export class CursosComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  searchQuery = signal('');
  viewMode = signal<'grid' | 'list'>('grid');
  courses = signal<StudentCourse[]>([]);

  filteredCourses = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.courses();
    return this.courses().filter(c =>
      c.course.name.toLowerCase().includes(q) ||
      (c.course.code ?? '').toLowerCase().includes(q)
    );
  });

  constructor(private studentService: StudentService) {}

  ngOnInit() {
    this.studentService.getCourses().subscribe({
      next: (data) => { this.courses.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar cursos'); this.loading.set(false); }
    });
  }

  courseCoverUrl(c: StudentCourse): string {
    const url = c.course?.imageUrl?.trim();
    if (url) return url;
    return '/images/course-default.svg';
  }

  courseCoverAlt(c: StudentCourse): string {
    return `Portada: ${c.course?.name ?? 'curso'}`;
  }

  gradeLabel(c: StudentCourse): string {
    const g = (c.section?.grade ?? c.gradeSection ?? '').trim();
    const sec = (c.section?.name ?? '').trim();
    if (g && sec) return `${g} · ${sec}`;
    return g || sec || '—';
  }

  toggleView() { this.viewMode.set(this.viewMode() === 'grid' ? 'list' : 'grid'); }
}
