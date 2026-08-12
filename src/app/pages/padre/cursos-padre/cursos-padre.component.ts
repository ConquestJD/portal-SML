import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ParentService, Child } from '../../../services/parent.service';

/** Una fila por docente-asignación (id = TeacherAssignment.id para rutas del portal). */
export interface ParentListedCourse {
  id: string;
  name: string;
  code: string;
  teacher: string;
  schedule: string;
  average: string;
  hours: number | null;
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
  children = signal<Child[]>([]);
  /** Filas ya mapeadas desde la API */
  courses = signal<ParentListedCourse[]>([]);

  readonly isLoading = this.loading;

  selectedChild = computed(() => this.children().find((c) => c.id === this.selectedChildId()) ?? null);

  filteredCourses = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    let list = this.courses();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.teacher.toLowerCase().includes(q),
      );
    }
    return list;
  });

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
        const initial =
          qId && data.some((c) => c.id === qId) ? qId! : data[0].id;
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

  getChildName(c: Child): string {
    return `${c.user.firstName} ${c.user.lastName}`;
  }

  getChildGrade(c: Child): string {
    return c.grade ?? c.enrollments?.[0]?.section?.grade ?? '';
  }

  getChildInitial(c: Child): string {
    const fn = c.user?.firstName?.charAt(0) ?? '';
    const ln = c.user?.lastName?.charAt(0) ?? '';
    return (fn + ln).toUpperCase() || '?';
  }

  courseInitial(course: ParentListedCourse): string {
    return (course.name?.charAt(0) ?? '?').toUpperCase();
  }

  onSearchInput(event: Event) {
    const el = event.target as HTMLInputElement;
    this.searchQuery.set(el.value);
  }

  private mapAssignment(row: unknown): ParentListedCourse {
    const a = row as Record<string, unknown>;
    const course = (a['course'] as Record<string, unknown>) ?? {};
    const teacher = (a['teacher'] as Record<string, unknown>) ?? {};
    const user = (teacher['user'] as Record<string, unknown>) ?? {};
    const fn = (user['firstName'] as string) ?? '';
    const ln = (user['lastName'] as string) ?? '';
    const teacherName = `${fn} ${ln}`.trim() || '—';

    const name = (course['name'] as string) ?? '—';
    const code = (course['code'] as string) ?? '—';
    const hours = typeof course['hours'] === 'number' ? (course['hours'] as number) : null;
    const scheduleRaw = course['schedule'];

    return {
      id: String(a['id'] ?? ''),
      name,
      code,
      teacher: teacherName,
      schedule: this.formatSchedule(scheduleRaw),
      average: '—',
      hours,
    };
  }

  private formatSchedule(s: unknown): string {
    if (s == null) return '—';
    if (typeof s === 'string') return s.trim() || '—';
    if (Array.isArray(s) && s.length) {
      const parts = (s as Record<string, unknown>[])
        .map((x) => {
          const day = x['day'] ?? x['día'];
          const start = x['start'] ?? x['inicio'];
          const end = x['end'] ?? x['fin'];
          const bits = [day, start, end].filter((v) => v != null && String(v).trim() !== '');
          return bits.map(String).join(' ');
        })
        .filter(Boolean);
      return parts.length ? parts.join(' · ') : '—';
    }
    if (typeof s === 'object' && s !== null) {
      const o = s as Record<string, unknown>;
      if (typeof o['label'] === 'string' && o['label'].trim()) return o['label'];
      if (typeof o['text'] === 'string' && o['text'].trim()) return o['text'];
    }
    return '—';
  }
}
