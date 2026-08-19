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
  viewMode = signal<'catalog' | 'list'>('catalog');
  courses = signal<StudentCourse[]>([]);

  readonly weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  readonly weekDayShort = ['L', 'M', 'X', 'J', 'V', 'S'];

  filteredCourses = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = [...this.courses()].sort((a, b) =>
      this.getCourseName(a).localeCompare(this.getCourseName(b), 'es'),
    );
    if (!q) return list;
    return list.filter(c => {
      const name = this.getCourseName(c).toLowerCase();
      const code = this.getCourseCode(c).toLowerCase();
      const teacher = this.teacherName(c).toLowerCase();
      return name.includes(q) || code.includes(q) || teacher.includes(q);
    });
  });

  pendingTotal = computed(() =>
    this.courses().reduce((sum, c) => sum + (c.pendingTasksCount ?? 0), 0),
  );

  overallAverage = computed(() => {
    const nums = this.courses()
      .map(c => c.averageScore ?? c.average)
      .filter((n): n is number => n != null && Number.isFinite(Number(n)))
      .map(Number);
    if (!nums.length) return null;
    return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
  });

  teacherCount = computed(() => {
    const names = new Set(
      this.courses().map(c => this.teacherName(c)).filter(n => n && n !== '—'),
    );
    return names.size;
  });

  hasActiveFilters = computed(() => !!this.searchQuery().trim());

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

  resetFilters() {
    this.searchQuery.set('');
  }

  getCourseName(c: StudentCourse): string {
    return (c.name ?? c.course?.name ?? 'Curso').trim() || 'Curso';
  }

  getCourseCode(c: StudentCourse): string {
    return (c.code || c.course?.code || '').trim();
  }

  getCourseColor(c: StudentCourse): string {
    return (c.course?.color || '').trim() || '#003366';
  }

  teacherName(c: StudentCourse): string {
    return (c.teacherName ?? '').trim() || '—';
  }

  coverUrl(c: StudentCourse): string {
    return resolveCourseCoverUrl({
      name: this.getCourseName(c),
      imageUrl: c.course?.imageUrl,
    });
  }

  coverAlt(c: StudentCourse): string {
    return courseCoverAlt(this.getCourseName(c));
  }

  dayHasClass(c: StudentCourse, day: string): boolean {
    return (c.course?.schedule ?? []).some(s => s.day === day);
  }

  formatScheduleHint(c: StudentCourse): string {
    const sched = c.course?.schedule;
    if (!sched?.length) return 'Sin horario';
    return sched
      .slice(0, 3)
      .map(s => `${(s.day ?? '').slice(0, 3)} ${s.startTime ?? ''}–${s.endTime ?? ''}`.trim())
      .filter(Boolean)
      .join(' · ');
  }

  hoursLabel(c: StudentCourse): string {
    const hours = c.course?.hours;
    return hours ? `${hours} h` : '';
  }

  averageLabel(c: StudentCourse): string | number {
    const n = c.averageScore ?? c.average;
    if (n == null || !Number.isFinite(Number(n))) return '—';
    return n;
  }
}
