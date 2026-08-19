import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService, StudentAttendance, StudentCourse } from '../../services/student.service';

interface AttendanceMonthGroup {
  key: string;
  label: string;
  items: StudentAttendance[];
}

@Component({
  selector: 'app-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asistencia.component.html',
  styleUrl: './asistencia.component.css',
})
export class AsistenciaComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedMonth = signal('');
  selectedCourse = signal('');
  attendanceRecords = signal<StudentAttendance[]>([]);
  summary = signal<Record<string, number>>({});
  courses = signal<StudentCourse[]>([]);

  totalSessions = computed(() => {
    const s = this.summary();
    return (s['PRESENT'] ?? 0) + (s['ABSENT'] ?? 0) + (s['LATE'] ?? 0) + (s['JUSTIFIED'] ?? 0);
  });

  /** % de sesiones con asistencia efectiva (presente + justificado). */
  attendancePercent = computed(() => {
    const s = this.summary();
    const total = this.totalSessions();
    if (!total) return 0;
    const ok = (s['PRESENT'] ?? 0) + (s['JUSTIFIED'] ?? 0);
    return Math.round((ok / total) * 100);
  });

  attendanceBar = computed(() => {
    const total = this.totalSessions();
    const s = this.summary();
    const seg = (key: string) => {
      const n = s[key] ?? 0;
      return { n, pct: total ? (n / total) * 100 : 0 };
    };
    return {
      present: seg('PRESENT'),
      late: seg('LATE'),
      justified: seg('JUSTIFIED'),
      absent: seg('ABSENT'),
    };
  });

  recordsByMonth = computed((): AttendanceMonthGroup[] => {
    const map = new Map<string, StudentAttendance[]>();
    for (const row of this.attendanceRecords()) {
      const d = this.parseDay(row.date);
      const key = d
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : 'sin-fecha';
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, items]) => ({
        key,
        label: this.monthHeading(key, items[0]?.date),
        items,
      }));
  });

  constructor(private studentService: StudentService) {}

  ngOnInit() {
    this.studentService.getCourses().subscribe({
      next: (list) => this.courses.set(Array.isArray(list) ? list : []),
      error: () => this.courses.set([]),
    });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.studentService
      .getAttendance({
        month: this.selectedMonth().trim() || undefined,
        courseId: this.selectedCourse().trim() || undefined,
      })
      .subscribe({
        next: ({ records, summary }) => {
          this.attendanceRecords.set(records);
          this.summary.set(summary ?? {});
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar tu asistencia.');
          this.loading.set(false);
        },
      });
  }

  onFilterChange() {
    this.load();
  }

  countStatus(key: string): number {
    return this.summary()[key] ?? 0;
  }

  private parseDay(dateStr?: string): Date | null {
    if (!dateStr) return null;
    const iso = /^\d{4}-\d{2}-\d{2}/.test(dateStr)
      ? `${dateStr.slice(0, 10)}T12:00:00`
      : dateStr;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private monthHeading(key: string, sample?: string): string {
    if (key === 'sin-fecha') return 'Sin fecha';
    const d = this.parseDay(sample) ?? this.parseDay(`${key}-01`);
    if (!d) return key;
    const label = d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  sessionDay(dateStr: string): string {
    const d = this.parseDay(dateStr);
    return d ? String(d.getDate()) : '—';
  }

  sessionMonth(dateStr: string): string {
    const d = this.parseDay(dateStr);
    if (!d) return '';
    return d.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
  }

  formatDay(dateStr: string): string {
    const d = this.parseDay(dateStr);
    return d
      ? d.toLocaleDateString('es-PE', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
      : dateStr || '—';
  }

  courseLabel(rec: StudentAttendance): string {
    return rec.course?.name?.trim() || '—';
  }

  statusLabel(status: string): string {
    const u = (status || '').toUpperCase();
    if (u === 'PRESENT') return 'Presente';
    if (u === 'ABSENT') return 'Falta';
    if (u === 'LATE') return 'Tardanza';
    if (u === 'JUSTIFIED') return 'Justificado';
    return status || '—';
  }
}
