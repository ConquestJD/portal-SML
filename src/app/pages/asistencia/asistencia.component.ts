import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService, StudentAttendance, StudentCourse } from '../../services/student.service';

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

  formatDay(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(`${dateStr}T12:00:00`);
    return Number.isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('es-PE', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
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

  rowStatusClass(status: string): string {
    const u = (status || '').toUpperCase();
    if (u === 'PRESENT') return 'row-present';
    if (u === 'ABSENT') return 'row-absent';
    if (u === 'LATE') return 'row-late';
    if (u === 'JUSTIFIED') return 'row-justified';
    return '';
  }

  badgeClass(status: string): string {
    const u = (status || '').toUpperCase();
    if (u === 'PRESENT') return 'badge-success';
    if (u === 'ABSENT') return 'badge-error';
    if (u === 'LATE') return 'badge-warning';
    if (u === 'JUSTIFIED') return 'badge-info';
    return '';
  }
}
