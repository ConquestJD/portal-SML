import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ParentService, Child } from '../../../services/parent.service';
import { courseCoverAlt, resolveCourseCoverUrl } from '../../../shared/utils/course-cover';

export interface ParentScheduleSlot {
  day: string;
  startTime: string;
  endTime: string;
}

/** Una fila por docente-asignación (id = TeacherAssignment.id para rutas del portal). */
export interface ParentListedCourse {
  id: string;
  name: string;
  code: string;
  teacher: string;
  color: string;
  imageUrl: string | null;
  hours: number | null;
  schedule: ParentScheduleSlot[];
}

@Component({
  selector: 'app-cursos-padre',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cursos-padre.component.html',
  styleUrl: './cursos-padre.component.css',
})
export class CursosPadreComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedChildId = signal('');
  searchQuery = signal('');
  viewMode = signal<'catalog' | 'list'>('catalog');
  children = signal<Child[]>([]);
  courses = signal<ParentListedCourse[]>([]);

  readonly isLoading = this.loading;
  readonly weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  readonly weekDayShort = ['L', 'M', 'X', 'J', 'V', 'S'];

  selectedChild = computed(() => this.children().find((c) => c.id === this.selectedChildId()) ?? null);

  filteredCourses = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = [...this.courses()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.teacher.toLowerCase().includes(q),
    );
  });

  teacherCount = computed(() => {
    const names = this.courses()
      .map((c) => c.teacher.trim())
      .filter((name) => name && name !== '—');
    return new Set(names).size;
  });

  withoutScheduleCount = computed(
    () => this.courses().filter((c) => c.schedule.length === 0).length,
  );

  hasActiveFilters = computed(() => !!this.searchQuery().trim());

  constructor(
    private parentService: ParentService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.parentService.getChildren().subscribe({
      next: (data) => {
        this.children.set(data);
        if (!data.length) {
          this.loading.set(false);
          return;
        }
        const qId = this.route.snapshot.queryParamMap.get('childId');
        const initial = qId && data.some((c) => c.id === qId) ? qId : data[0].id;
        this.selectedChildId.set(initial);
        this.loadCourses(initial);
      },
      error: () => {
        this.error.set('Error al cargar hijos');
        this.loading.set(false);
      },
    });
  }

  selectChild(id: string) {
    this.selectedChildId.set(id);
    this.searchQuery.set('');
    this.loadCourses(id);
  }

  loadCourses(childId: string) {
    this.loading.set(true);
    this.error.set('');
    this.parentService.getChildCourses(childId).subscribe({
      next: (data) => {
        const raw = Array.isArray(data) ? data : [];
        this.courses.set(raw.map((row) => this.mapAssignment(row)));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar los cursos');
        this.courses.set([]);
        this.loading.set(false);
      },
    });
  }

  resetFilters() {
    this.searchQuery.set('');
  }

  getChildName(c: Child): string {
    return `${c.user.firstName} ${c.user.lastName}`;
  }

  getChildGrade(c: Child): string {
    const grade = (c.grade ?? c.enrollments?.[0]?.section?.grade ?? '').trim();
    const level = (c.level ?? c.enrollments?.[0]?.section?.level ?? '').trim();
    return [grade, level].filter(Boolean).join(' · ');
  }

  getChildInitial(c: Child): string {
    const fn = c.user?.firstName?.charAt(0) ?? '';
    const ln = c.user?.lastName?.charAt(0) ?? '';
    return (fn + ln).toUpperCase() || '?';
  }

  coverUrl(course: ParentListedCourse): string {
    return resolveCourseCoverUrl({ name: course.name, imageUrl: course.imageUrl });
  }

  coverAlt(course: ParentListedCourse): string {
    return courseCoverAlt(course.name);
  }

  dayHasClass(course: ParentListedCourse, day: string): boolean {
    return course.schedule.some((s) => s.day === day);
  }

  scheduleHint(course: ParentListedCourse): string {
    if (!course.schedule.length) return 'Sin horario';
    return course.schedule
      .slice(0, 3)
      .map((s) => `${s.day.slice(0, 3)} ${s.startTime}–${s.endTime}`.trim())
      .filter(Boolean)
      .join(' · ');
  }

  hoursLabel(course: ParentListedCourse): string {
    return course.hours ? `${course.hours} h` : '';
  }

  private mapAssignment(row: unknown): ParentListedCourse {
    const a = row as Record<string, unknown>;
    const course = (a['course'] as Record<string, unknown>) ?? {};
    const teacher = (a['teacher'] as Record<string, unknown>) ?? {};
    const user = (teacher['user'] as Record<string, unknown>) ?? {};
    const fn = (user['firstName'] as string) ?? '';
    const ln = (user['lastName'] as string) ?? '';
    const teacherName = `${fn} ${ln}`.trim() || '—';
    const imageUrl = typeof course['imageUrl'] === 'string' ? course['imageUrl'].trim() : '';

    return {
      id: String(a['id'] ?? ''),
      name: String(course['name'] ?? 'Curso'),
      code: String(course['code'] ?? '').trim(),
      teacher: teacherName,
      color: String(course['color'] ?? '').trim() || '#003366',
      imageUrl: imageUrl || null,
      hours: typeof course['hours'] === 'number' ? course['hours'] : null,
      schedule: this.parseSchedule(course['schedule']),
    };
  }

  private parseSchedule(raw: unknown): ParentScheduleSlot[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        const x = (item ?? {}) as Record<string, unknown>;
        const day = this.normalizeDay(String(x['day'] ?? x['día'] ?? ''));
        const startTime = String(x['startTime'] ?? x['start'] ?? x['inicio'] ?? '').trim();
        const endTime = String(x['endTime'] ?? x['end'] ?? x['fin'] ?? '').trim();
        return { day, startTime, endTime };
      })
      .filter((s) => s.day);
  }

  private normalizeDay(raw: string): string {
    const key = raw.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const map: Record<string, string> = {
      lunes: 'Lunes',
      lun: 'Lunes',
      monday: 'Lunes',
      martes: 'Martes',
      mar: 'Martes',
      tuesday: 'Martes',
      miercoles: 'Miércoles',
      mie: 'Miércoles',
      wednesday: 'Miércoles',
      jueves: 'Jueves',
      jue: 'Jueves',
      thursday: 'Jueves',
      viernes: 'Viernes',
      vie: 'Viernes',
      friday: 'Viernes',
      sabado: 'Sábado',
      sab: 'Sábado',
      saturday: 'Sábado',
    };
    return map[key] ?? raw.trim();
  }
}
