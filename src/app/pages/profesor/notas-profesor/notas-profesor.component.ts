import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TeacherService, TeacherCourse, GradeEntry } from '../../../services/teacher.service';

@Component({
  selector: 'app-notas-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './notas-profesor.component.html',
  styleUrl: './notas-profesor.component.css'
})
export class NotasProfesorComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedCourse = signal('');
  courses = signal<TeacherCourse[]>([]);
  grades = signal<GradeEntry[]>([]);
  loadingGrades = signal(false);

  constructor(private teacherService: TeacherService) {}

  ngOnInit() {
    this.teacherService.getCourses().subscribe({
      next: (data) => {
        this.courses.set(data);
        this.loading.set(false);
        if (data.length) {
          this.selectedCourse.set(data[0].id);
          this.loadGrades(data[0].id);
        }
      },
      error: () => { this.error.set('Error al cargar cursos'); this.loading.set(false); }
    });
  }

  onCourseChange(courseId: string) {
    this.selectedCourse.set(courseId);
    this.loadGrades(courseId);
  }

  loadGrades(courseId: string) {
    this.loadingGrades.set(true);
    this.teacherService.getGrades(courseId).subscribe({
      next: (data) => { this.grades.set(data); this.loadingGrades.set(false); },
      error: () => this.loadingGrades.set(false)
    });
  }

  getStudentName(g: GradeEntry): string {
    return `${g.student.user.firstName} ${g.student.user.lastName}`;
  }

  getSelectedCourseName(): string {
    return this.courses().find(c => c.id === this.selectedCourse())?.course.name ?? '';
  }
}
