import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentService, StudentAttendance } from '../../services/student.service';

@Component({
  selector: 'app-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './asistencia.component.html',
  styleUrl: './asistencia.component.css'
})
export class AsistenciaComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedMonth = signal('');
  selectedCourse = signal('');

  attendanceRecords = signal<StudentAttendance[]>([]);
  summary = signal<Record<string, number>>({});

  constructor(private studentService: StudentService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.studentService.getAttendance({
      month: this.selectedMonth() || undefined,
      courseId: this.selectedCourse() || undefined
    }).subscribe({
      next: ({ records, summary }) => {
        this.attendanceRecords.set(records);
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar asistencia'); this.loading.set(false); }
    });
  }

  getAttendancePercentage(): number {
    const s = this.summary();
    const total = (s['PRESENT'] ?? 0) + (s['ABSENT'] ?? 0) + (s['LATE'] ?? 0) + (s['JUSTIFIED'] ?? 0);
    if (!total) return 0;
    return Math.round(((s['PRESENT'] ?? 0) / total) * 100);
  }

  onFilterChange() { this.load(); }
}
