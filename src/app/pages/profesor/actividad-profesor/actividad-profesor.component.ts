import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  TeacherActivityItem,
  TeacherCourse,
  TeacherService,
} from '../../../services/teacher.service';

type StreamFilter = 'todos' | 'entregas' | 'publicaciones';

interface StreamDay {
  key: string;
  label: string;
  items: TeacherActivityItem[];
}

@Component({
  selector: 'app-actividad-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './actividad-profesor.component.html',
  styleUrl: './actividad-profesor.component.css',
})
export class ActividadProfesorComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  items = signal<TeacherActivityItem[]>([]);
  courses = signal<TeacherCourse[]>([]);
  courseId = signal('');
  filter = signal<StreamFilter>('todos');

  submissionCount = computed(() =>
    this.items().filter(i => i.kind === 'submission' || i.kind === 'late').length,
  );
  publishCount = computed(() =>
    this.items().filter(i =>
      i.kind === 'task' || i.kind === 'material' || i.kind === 'announcement' || i.kind === 'exam',
    ).length,
  );

  filteredItems = computed(() => {
    const f = this.filter();
    const list = this.items();
    if (f === 'entregas') return list.filter(i => i.kind === 'submission' || i.kind === 'late' || i.kind === 'graded');
    if (f === 'publicaciones') {
      return list.filter(i =>
        i.kind === 'task' || i.kind === 'material' || i.kind === 'announcement' || i.kind === 'exam',
      );
    }
    return list;
  });

  days = computed((): StreamDay[] => {
    const groups = new Map<string, TeacherActivityItem[]>();
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

  constructor(private teacherService: TeacherService) {}

  ngOnInit() {
    this.teacherService.getCourses().subscribe({
      next: list => this.courses.set(list),
    });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.teacherService.getActivity(this.courseId() || undefined).subscribe({
      next: data => {
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

  courseLabel(c: TeacherCourse): string {
    const name = c.course?.name ?? c.name ?? 'Curso';
    const grade = (c.course?.grade ?? c.grade ?? '').trim();
    const level = (c.course?.level ?? '').trim();
    const meta = [grade, level].filter(Boolean).join(' · ');
    return meta ? `${name} · ${meta}` : name;
  }

  kindLabel(kind: TeacherActivityItem['kind']): string {
    if (kind === 'submission') return 'Entrega';
    if (kind === 'late') return 'Tarde';
    if (kind === 'graded') return 'Calificada';
    if (kind === 'task') return 'Tarea';
    if (kind === 'material') return 'Material';
    if (kind === 'announcement') return 'Comunicado';
    return 'Examen';
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0])
      .join('')
      .toUpperCase();
  }

  timeLabel(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const min = Math.round(diff / 60000);
    if (min < 1) return 'Ahora';
    if (min < 60) return `Hace ${min} min`;
    const hrs = Math.round(min / 60);
    if (hrs < 24 && this.dayKey(iso) === this.dayKey(new Date().toISOString())) {
      return d.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
  }

  itemLink(item: TeacherActivityItem): string[] {
    if ((item.kind === 'submission' || item.kind === 'late' || item.kind === 'graded') && item.taskId) {
      return ['/profesor/cursos', item.courseId, 'tareas', item.taskId, 'revisar'];
    }
    if (item.kind === 'task' && item.taskId) {
      return ['/profesor/cursos', item.courseId, 'tareas', item.taskId];
    }
    if (item.kind === 'material' && item.materialId) {
      return ['/profesor/cursos', item.courseId, 'materiales', item.materialId];
    }
    if (item.kind === 'announcement' && item.announcementId) {
      return ['/profesor/cursos', item.courseId, 'comunicados', item.announcementId];
    }
    if (item.kind === 'exam' && item.examId) {
      return ['/profesor/cursos', item.courseId, 'examenes', item.examId];
    }
    return ['/profesor/cursos', item.courseId];
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
    const todayKey = this.dayKey(today.toISOString());
    const yest = new Date(today);
    yest.setDate(today.getDate() - 1);
    if (key === todayKey) return 'Hoy';
    if (key === this.dayKey(yest.toISOString())) return 'Ayer';
    const label = date.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
}
