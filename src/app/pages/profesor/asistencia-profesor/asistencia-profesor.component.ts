import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TeacherService, TeacherCourse } from '../../../services/teacher.service';

@Component({
  selector: 'app-asistencia-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './asistencia-profesor.component.html',
  styleUrl: './asistencia-profesor.component.css'
})
export class AsistenciaProfesorComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedCourse = signal('');
  courses = signal<TeacherCourse[]>([]);
  history = signal<unknown[]>([]);
  loadingHistory = signal(false);

  constructor(private teacherService: TeacherService) {}

  ngOnInit() {
    this.teacherService.getCourses().subscribe({
      next: (data) => {
        this.courses.set(data);
        this.loading.set(false);
        if (data.length) {
          this.selectedCourse.set(data[0].id);
          this.loadHistory(data[0].id);
        }
      },
      error: () => { this.error.set('Error al cargar cursos'); this.loading.set(false); }
    });
  }

  onCourseChange(courseId: string) {
    this.selectedCourse.set(courseId);
    this.loadHistory(courseId);
  }

  loadHistory(courseId: string) {
    this.loadingHistory.set(true);
    this.teacherService.getAttendanceHistory(courseId).subscribe({
      next: (data) => { this.history.set(data); this.loadingHistory.set(false); },
      error: () => this.loadingHistory.set(false)
    });
  }

  getSelectedCourseName(): string {
    return this.courses().find(c => c.id === this.selectedCourse())?.course.name ?? '';
  }

  totalPending = computed(() => (this.history() as any[]).filter((r: any) => r.status === 'ABSENT').length);
}
