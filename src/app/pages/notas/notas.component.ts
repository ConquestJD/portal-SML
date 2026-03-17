import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentService, StudentGrade } from '../../services/student.service';

@Component({
  selector: 'app-notas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './notas.component.html',
  styleUrl: './notas.component.css'
})
export class NotasComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedPeriod = signal('');
  selectedCourse = signal('');
  grades = signal<StudentGrade[]>([]);
  courses = signal<any[]>([]);

  filterPeriod = this.selectedPeriod;
  filterCourse = this.selectedCourse;

  generalAverage = computed(() => this.getAverage());
  previousAverage = signal(0);

  constructor(private studentService: StudentService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.studentService.getGrades({
      period: this.selectedPeriod() || undefined,
      courseId: this.selectedCourse() || undefined
    }).subscribe({
      next: (data) => { this.grades.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar notas'); this.loading.set(false); }
    });
  }

  exportGrades() {
    window.open(this.studentService.getGradesExportUrl(this.selectedPeriod() || undefined));
  }

  onFilterChange() { this.load(); }

  getAverage(): number {
    const g = this.grades();
    if (!g.length) return 0;
    const sum = g.reduce((acc, cur) => acc + cur.score, 0);
    return Math.round((sum / g.length) * 10) / 10;
  }
}
