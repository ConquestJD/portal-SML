import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { TeacherService, TeacherCourse, TeacherTask, GradeEntry, Material } from '../../../services/teacher.service';

type TabType = 'estudiantes' | 'tareas' | 'notas' | 'asistencia' | 'material' | 'mensajes' | 'comunicados' | 'foros';

@Component({
  selector: 'app-curso-detalle-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './curso-detalle-profesor.component.html',
  styleUrl: './curso-detalle-profesor.component.css'
})
export class CursoDetalleProfesorComponent implements OnInit {
  courseId = signal('');
  activeTab = signal<TabType>('estudiantes');
  searchQuery = signal('');
  loading = signal(true);
  error = signal('');

  course = signal<TeacherCourse | null>(null);
  students = signal<unknown[]>([]);
  tasks = signal<TeacherTask[]>([]);
  grades = signal<GradeEntry[]>([]);
  attendance = signal<unknown[]>([]);
  materials = signal<Material[]>([]);

  filteredStudents = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const list = this.students() as any[];
    if (!q) return list;
    return list.filter((s: any) =>
      `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`.toLowerCase().includes(q) ||
      (s.studentCode ?? '').toLowerCase().includes(q)
    );
  });

  constructor(private route: ActivatedRoute, private teacherService: TeacherService) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.courseId.set(id);
    this.loadCourse();
    this.loadStudents();
  }

  loadCourse() {
    this.teacherService.getCourse(this.courseId()).subscribe({
      next: (data) => { this.course.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar el curso'); this.loading.set(false); }
    });
  }

  loadStudents() {
    this.teacherService.getStudentsInCourse(this.courseId()).subscribe({
      next: (data) => this.students.set(data)
    });
  }

  selectTab(tab: TabType) {
    this.activeTab.set(tab);
    switch (tab) {
      case 'tareas': this.loadTasks(); break;
      case 'notas': this.loadGrades(); break;
      case 'asistencia': this.loadAttendance(); break;
      case 'material': this.loadMaterials(); break;
    }
  }

  loadTasks() {
    this.teacherService.getTasks(this.courseId()).subscribe({
      next: (data) => this.tasks.set(data)
    });
  }

  loadGrades() {
    this.teacherService.getGrades(this.courseId()).subscribe({
      next: (data) => this.grades.set(data)
    });
  }

  loadAttendance() {
    this.teacherService.getAttendanceHistory(this.courseId()).subscribe({
      next: (data) => this.attendance.set(data)
    });
  }

  loadMaterials() {
    this.teacherService.getMaterials(this.courseId()).subscribe({
      next: (data) => this.materials.set(data)
    });
  }

  deleteTask(taskId: string) {
    if (!confirm('¿Eliminar tarea?')) return;
    this.teacherService.deleteTask(this.courseId(), taskId).subscribe({
      next: () => this.loadTasks()
    });
  }

  deleteMaterial(materialId: string) {
    if (!confirm('¿Eliminar material?')) return;
    this.teacherService.deleteMaterial(this.courseId(), materialId).subscribe({
      next: () => this.loadMaterials()
    });
  }

  getCourseName(): string { return this.course()?.course.name ?? ''; }
  getGradeSection(): string {
    const c = this.course();
    return c ? `${c.section.grade} - Sección ${c.section.name}` : '';
  }

  setTab(tab: TabType) { this.selectTab(tab); }
}
