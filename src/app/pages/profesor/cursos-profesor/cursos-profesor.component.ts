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
    const q = this.searchQuery().toLowerCase().trim();
    let list = this.courses();
    if (q) {
      list = list.filter(c =>
        (c.course?.name ?? '').toLowerCase().includes(q) ||
        (c.course?.code ?? '').toLowerCase().includes(q) ||
        (c.course?.grade ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  });

  constructor(private teacherService: TeacherService) {}

  ngOnInit() {
    this.teacherService.getCourses().subscribe({
      next: (data) => { this.courses.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar cursos'); this.loading.set(false); }
    });
  }

  getCourseName(c: TeacherCourse): string { return c.course?.name ?? ''; }

  /**
   * Devuelve "Grado · Nivel" del curso (p. ej. "3 años · Inicial").
   * El sistema usa "un grado = un curso", por eso no se muestra la sección.
   */
  getGradeLabel(c: TeacherCourse): string {
    const grade = (c.course?.grade ?? '').trim();
    const level = (c.course?.level ?? '').trim();
    return [grade, level].filter(Boolean).join(' · ') || '—';
  }

  getCourseInitial(c: TeacherCourse): string {
    const name = (c.course?.name ?? '').trim();
    return name ? name.charAt(0).toUpperCase() : '·';
  }

  /** Color de acento del curso, con fallback al primario del tema. */
  getCourseColor(c: TeacherCourse): string {
    return (c.course?.color || '').trim() || '#003366';
  }

  /** Texto y clase para la insignia de estado. */
  getStatusBadge(c: TeacherCourse): { label: string; cls: string } {
    switch (c.status) {
      case 'archived': return { label: 'Archivado', cls: 'badge-secondary' };
      case 'finished': return { label: 'Finalizado', cls: 'badge-info' };
      default: return { label: 'Activo', cls: 'badge-success' };
    }
  }

  formatScheduleHint(c: TeacherCourse): string {
    const sched = c.course?.schedule;
    if (!sched?.length) return 'Sin horario';
    return sched
      .slice(0, 3)
      .map(s => `${s.day ?? ''} ${s.startTime ?? ''}-${s.endTime ?? ''}`.trim())
      .filter(Boolean)
      .join(' · ');
  }

  onSearch() { /* computed handles filtering */ }
  clearSearch() { this.searchQuery.set(''); }
  toggleView() { this.viewMode.set(this.viewMode() === 'grid' ? 'list' : 'grid'); }
}
