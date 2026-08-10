import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentService, StudentCourse } from '../../services/student.service';
import { courseCoverAlt, resolveCourseCoverUrl } from '../../shared/utils/course-cover';

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
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.courses();
    return this.courses().filter(c => {
      const name = (c.name ?? c.course?.name ?? '').toLowerCase();
      const code = (c.course?.code ?? c.code ?? '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  });

  constructor(private studentService: StudentService) {}

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.loading.set(true);
    this.error.set('');
    this.studentService.getCourses().subscribe({
      next: (data) => { this.courses.set(data); this.loading.set(false); },
      error: () => { this.error.set('No se pudieron cargar los cursos.'); this.loading.set(false); }
    });
  }

  courseCoverUrl(c: StudentCourse): string {
    return resolveCourseCoverUrl({
      name: c.name ?? c.course?.name,
      imageUrl: c.course?.imageUrl,
    });
  }

  courseCoverAlt(c: StudentCourse): string {
    return courseCoverAlt(c.name ?? c.course?.name);
  }

  gradeLabel(c: StudentCourse): string {
    const g = (c.section?.grade ?? c.gradeSection ?? '').trim();
    const sec = (c.section?.name ?? '').trim();
    if (g && sec) return `${g} · ${sec}`;
    return g || sec || '—';
  }
}
