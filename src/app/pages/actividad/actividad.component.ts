import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  StudentActivityItem,
  StudentActivityKind,
  StudentCourse,
  StudentService,
} from '../../services/student.service';

type StreamFilter = 'todos' | 'calificaciones' | 'aula';

interface StreamDay {
  key: string;
  label: string;
  items: StudentActivityItem[];
}

@Component({
  selector: 'app-actividad',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './actividad.component.html',
  styleUrl: './actividad.component.css',
})
export class ActividadComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  items = signal<StudentActivityItem[]>([]);
  courses = signal<StudentCourse[]>([]);
  courseId = signal('');
  filter = signal<StreamFilter>('todos');
  revealed = signal<Set<string>>(new Set());

  gradeCount = computed(() => this.items().filter((i) => this.isGradeKind(i.kind)).length);
  publishCount = computed(() => this.items().filter((i) => !this.isGradeKind(i.kind)).length);

  filteredItems = computed(() => {
    const f = this.filter();
    const list = this.items();
    if (f === 'calificaciones') return list.filter((i) => this.isGradeKind(i.kind));
    if (f === 'aula') return list.filter((i) => !this.isGradeKind(i.kind));
    return list;
  });

  days = computed((): StreamDay[] => {
    const groups = new Map<string, StudentActivityItem[]>();
    for (const item of this.filteredItems()) {
      const key = this.dayKey(item.at);
      const bucket = groups.get(key) ?? [];
      bucket.push(item);
      groups.set(key, bucket);
    }
    return [...groups.entries()].map(([key, items]) => ({
      key,
      label: this.dayLabel(key),
      items,
    }));
  });

  constructor(private studentService: StudentService) {}

  ngOnInit() {
    this.revealed.set(new Set());
    this.studentService.getCourses().subscribe({
      next: (list) => this.courses.set(list),
    });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.studentService.getActivity(this.courseId() || undefined).subscribe({
      next: (data) => {
        this.items.set(data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la actividad.');
        this.loading.set(false);
      },
    });
  }

  onCourseChange(id: string) {
    this.courseId.set(id);
    this.load();
  }

  isGradeKind(kind: StudentActivityKind): boolean {
    return kind === 'graded' || kind === 'period-grade' || kind === 'exam-grade';
  }

  isRevealed(id: string): boolean {
    return this.revealed().has(id);
  }

  reveal(id: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const next = new Set(this.revealed());
    next.add(id);
    this.revealed.set(next);
  }

  courseLabel(c: StudentCourse): string {
    const name = c.course?.name ?? c.name ?? 'Curso';
    const grade = (c.course?.grade ?? '').trim();
    const level = (c.course?.level ?? '').trim();
    const meta = [grade, level].filter(Boolean).join(' · ');
    return meta ? `${name} · ${meta}` : name;
  }

  kindLabel(kind: StudentActivityKind): string {
    if (kind === 'task') return 'Tarea';
    if (kind === 'material') return 'Material';
    if (kind === 'announcement') return 'Comunicado';
    if (kind === 'exam') return 'Examen';
    if (kind === 'graded') return 'Calificación';
    if (kind === 'period-grade') return 'Nota de período';
    return 'Nota de examen';
  }

  kindIcon(kind: StudentActivityKind): string {
    if (kind === 'task') return 'fas fa-clipboard-list';
    if (kind === 'material') return 'fas fa-folder-open';
    if (kind === 'announcement') return 'fas fa-bullhorn';
    if (kind === 'exam') return 'fas fa-file-lines';
    if (kind === 'graded') return 'fas fa-star';
    if (kind === 'period-grade') return 'fas fa-award';
    return 'fas fa-clipboard-check';
  }

  scoreParts(item: StudentActivityItem): { score: string; max: string } {
    const maxN = item.maxScore != null && Number.isFinite(Number(item.maxScore)) ? Number(item.maxScore) : 20;
    const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));
    if (item.score == null || !Number.isFinite(Number(item.score))) {
      return { score: '—', max: fmt(maxN) };
    }
    return { score: fmt(Number(item.score)), max: fmt(maxN) };
  }

  openLabel(item: StudentActivityItem): string {
    if (item.kind === 'task' || item.kind === 'graded') return 'Ver tarea';
    if (item.kind === 'material') return 'Ver material';
    if (item.kind === 'announcement') return 'Ver comunicado';
    if (item.kind === 'exam' || item.kind === 'exam-grade' || item.kind === 'period-grade') return 'Ver notas';
    return 'Ir al curso';
  }

  itemLink(item: StudentActivityItem): string[] {
    if ((item.kind === 'task' || item.kind === 'graded') && item.taskId && item.courseId) {
      return ['/cursos', item.courseId, 'tareas', item.taskId];
    }
    if (item.kind === 'announcement' && item.announcementId) {
      return ['/comunicados', item.announcementId];
    }
    if (item.courseId) return ['/cursos', item.courseId];
    return ['/cursos'];
  }

  itemQuery(item: StudentActivityItem): Record<string, string> | undefined {
    if (item.kind === 'material') return { tab: 'material' };
    if (item.kind === 'exam' || item.kind === 'exam-grade' || item.kind === 'period-grade') {
      return { tab: 'notas' };
    }
    if (item.kind === 'announcement' && !item.announcementId) return { tab: 'comunicados' };
    return undefined;
  }

  timeLabel(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const min = Math.round(diff / 60000);
    if (min < 1) return 'Ahora';
    if (min < 60) return `Hace ${min} min`;
    return d.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
  }

  private dayKey(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private dayLabel(key: string): string {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, (m || 1) - 1, d || 1);
    const today = new Date();
    const yest = new Date(today);
    yest.setDate(today.getDate() - 1);
    if (key === this.dayKey(today.toISOString())) return 'Hoy';
    if (key === this.dayKey(yest.toISOString())) return 'Ayer';
    const label = date.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
}
