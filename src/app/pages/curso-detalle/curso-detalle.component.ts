import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { StudentService, StudentCourse, StudentTask, StudentGrade } from '../../services/student.service';

type TabType = 'contenido' | 'tareas' | 'calificaciones' | 'comunicados' | 'mensajes' | 'foros' | 'compañeros';

@Component({
  selector: 'app-curso-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './curso-detalle.component.html',
  styleUrl: './curso-detalle.component.css'
})
export class CursoDetalleComponent implements OnInit {
  courseId = signal('');
  activeTab = signal<TabType>('contenido');
  loading = signal(true);
  error = signal('');

  course = signal<StudentCourse | null>(null);
  units = signal<unknown[]>([]);
  tasks = signal<StudentTask[]>([]);
  grades = signal<StudentGrade[]>([]);

  constructor(private route: ActivatedRoute, private studentService: StudentService) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.courseId.set(id);
    this.loadCourse();
    this.loadUnits();
  }

  loadCourse() {
    this.studentService.getCourse(this.courseId()).subscribe({
      next: (data) => { this.course.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar el curso'); this.loading.set(false); }
    });
  }

  loadUnits() {
    this.studentService.getCourseUnits(this.courseId()).subscribe({
      next: (data) => this.units.set(data)
    });
  }

  selectTab(tab: TabType) {
    this.activeTab.set(tab);
    if (tab === 'tareas') this.loadTasks();
    if (tab === 'calificaciones') this.loadGrades();
  }

  loadTasks() {
    this.studentService.getCourseTasks(this.courseId()).subscribe({
      next: (data) => this.tasks.set(data)
    });
  }

  loadGrades() {
    this.studentService.getCourseGrades(this.courseId()).subscribe({
      next: (data) => this.grades.set(data)
    });
  }

  downloadMaterial(unitId: string) {
    window.open(this.studentService.getMaterialDownloadUrl(this.courseId(), unitId));
  }

  getCourseName(): string { return this.course()?.course.name ?? ''; }

  setTab(tab: TabType) { this.selectTab(tab); }
}
