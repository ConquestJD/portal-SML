import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TeacherService, TeacherCourse } from '../../../services/teacher.service';
import { courseCoverAlt, resolveCourseCoverUrl } from '../../../shared/utils/course-cover';

interface GradeGroup {
  grade: string;
  level: string;
  courses: TeacherCourse[];
}

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
  filterGrade = signal('');
  viewMode = signal<'catalog' | 'list'>('catalog');
  courses = signal<TeacherCourse[]>([]);
  rosterCounts = signal<Record<string, number>>({});
  rosterCountsLoading = signal(false);

  readonly weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  readonly weekDayShort = ['L', 'M', 'X', 'J', 'V', 'S'];

  private readonly gradeOrder = [
    '3 años', '4 años', '5 años',
    '1ro Primaria', '2do Primaria', '3ro Primaria', '4to Primaria', '5to Primaria', '6to Primaria',
    '1ro Secundaria', '2do Secundaria', '3ro Secundaria', '4to Secundaria', '5to Secundaria',
  ];

  filteredCourses = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const grade = this.filterGrade();
    return this.courses().filter(c => {
      if (grade && (c.course?.grade ?? '') !== grade) return false;
      if (!q) return true;
      return (
        (c.course?.name ?? '').toLowerCase().includes(q) ||
        (c.course?.code ?? '').toLowerCase().includes(q) ||
        (c.course?.grade ?? '').toLowerCase().includes(q) ||
        (c.course?.level ?? '').toLowerCase().includes(q)
      );
    });
  });

  groupedCourses = computed((): GradeGroup[] => {
    const groups = new Map<string, TeacherCourse[]>();
    for (const c of this.filteredCourses()) {
      const key = (c.course?.grade ?? '').trim() || 'Sin grado';
      const list = groups.get(key) ?? [];
      list.push(c);
      groups.set(key, list);
    }
    return Array.from(groups.keys())
      .sort((a, b) => this.compareGrades(a, b))
      .map(grade => {
        const courses = (groups.get(grade) ?? [])
          .slice()
          .sort((a, b) => this.getCourseName(a).localeCompare(this.getCourseName(b), 'es'));
        return {
          grade,
          level: courses.find(c => !!c.course?.level)?.course?.level ?? '',
          courses,
        };
      });
  });

  availableGrades = computed(() => {
    const grades = new Set(
      this.courses().map(c => (c.course?.grade ?? '').trim()).filter(Boolean),
    );
    return Array.from(grades).sort((a, b) => this.compareGrades(a, b));
  });

  totalStudents = computed(() =>
    this.courses().reduce((sum, c) => sum + this.getStudentCount(c), 0),
  );

  pendingTotal = computed(() =>
    this.courses().reduce((sum, c) => sum + (c.pendingGrading ?? 0), 0),
  );

  hasActiveFilters = computed(() => !!this.searchQuery().trim() || !!this.filterGrade());

  constructor(private teacherService: TeacherService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.teacherService.getCourses().subscribe({
      next: (data) => {
        this.courses.set(data);
        this.loading.set(false);
        this.rosterCountsLoading.set(true);
        this.teacherService.getRosterCountsForCourses(data).subscribe({
          next: (map) => {
            this.rosterCounts.set(map);
            this.rosterCountsLoading.set(false);
          },
          error: () => {
            this.rosterCounts.set({});
            this.rosterCountsLoading.set(false);
          },
        });
      },
      error: () => {
        this.error.set('No se pudieron cargar tus cursos.');
        this.loading.set(false);
      },
    });
  }

  resetFilters() {
    this.searchQuery.set('');
    this.filterGrade.set('');
  }

  getStudentCount(c: TeacherCourse): number {
    const n = this.rosterCounts()[c.id];
    if (n !== undefined) return n;
    return c.students ?? c.studentsCount ?? 0;
  }

  getCourseName(c: TeacherCourse): string {
    return c.course?.name ?? 'Curso';
  }

  getCourseCode(c: TeacherCourse): string {
    return (c.code || c.course?.code || '').trim();
  }

  getCourseColor(c: TeacherCourse): string {
    return (c.course?.color || '').trim() || '#003366';
  }

  coverUrl(c: TeacherCourse): string {
    return resolveCourseCoverUrl({ name: this.getCourseName(c) });
  }

  coverAlt(c: TeacherCourse): string {
    return courseCoverAlt(this.getCourseName(c));
  }

  dayHasClass(c: TeacherCourse, day: string): boolean {
    return (c.course?.schedule ?? []).some(s => s.day === day);
  }

  formatScheduleHint(c: TeacherCourse): string {
    const sched = c.course?.schedule;
    if (!sched?.length) return 'Sin horario';
    return sched
      .slice(0, 3)
      .map(s => `${(s.day ?? '').slice(0, 3)} ${s.startTime ?? ''}–${s.endTime ?? ''}`.trim())
      .filter(Boolean)
      .join(' · ');
  }

  hoursLabel(c: TeacherCourse): string {
    const hours = c.course?.hours;
    return hours ? `${hours} h` : '';
  }

  levelLabel(level: string): string {
    const map: Record<string, string> = {
      inicial: 'Inicial', primaria: 'Primaria', secundaria: 'Secundaria',
      Inicial: 'Inicial', Primaria: 'Primaria', Secundaria: 'Secundaria',
    };
    return map[level] || level;
  }

  private compareGrades(a: string, b: string): number {
    if (a === 'Sin grado') return 1;
    if (b === 'Sin grado') return -1;
    const ia = this.gradeOrder.indexOf(a);
    const ib = this.gradeOrder.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'es');
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  }
}
