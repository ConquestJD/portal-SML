import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { TeacherService, TeacherCourse, TeacherTask, GradeEntry, Material, filterTeacherRosterByCourseGrade } from '../../../services/teacher.service';

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
  students = signal<any[]>([]);
  studentsLoading = signal(false);
  tasks = signal<TeacherTask[]>([]);
  grades = signal<GradeEntry[]>([]);
  attendance = signal<unknown[]>([]);
  materials = signal<Material[]>([]);

  filteredStudents = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const list = this.students();
    if (!q) return list;
    return list.filter((s: any) =>
      (s.name ?? '').toLowerCase().includes(q) ||
      (s.code ?? '').toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q)
    );
  });

  constructor(private route: ActivatedRoute, private teacherService: TeacherService) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.courseId.set(id);
    this.loadCourse();
  }

  /**
   * Id que debe usarse en todas las rutas `GET/POST /teacher/courses/:courseId/...`.
   * Contrato API: `courseId` es el id de la **asignación docente** (no el id del curso en catálogo).
   * @see FRONTEND.md sección «Portal del Profesor»
   */
  private apiTeacherAssignmentId(): string {
    const c = this.course();
    return c?.id ?? this.courseId();
  }

  loadCourse() {
    this.teacherService.getCourse(this.courseId()).subscribe({
      next: (data) => {
        this.course.set(data);
        this.loading.set(false);
        this.loadStudents();
      },
      error: () => { this.error.set('Error al cargar el curso'); this.loading.set(false); }
    });
  }

  loadStudents() {
    const c = this.course();
    const grade = (c?.course?.grade ?? '').trim();
    const level = (c?.course?.level ?? '').trim();
    const aid = this.apiTeacherAssignmentId();
    this.studentsLoading.set(true);

    this.teacherService
      .getStudentsInCourse(aid, {
        ...(grade ? { grade } : {}),
        ...(level ? { level } : {}),
      })
      .subscribe({
        next: (data) => {
          const rows = filterTeacherRosterByCourseGrade(data as any[], grade, level);
          this.students.set(this.normalizeStudents(rows as any[]));
          this.studentsLoading.set(false);
        },
        error: () => {
          this.students.set([]);
          this.studentsLoading.set(false);
        },
      });
  }

  /**
   * Normaliza filas de `GET /teacher/courses/:id/students` (u objetos anidados con `student`):
   * `{ id, code, name, email, average, status }`.
   */
  private normalizeStudents(raw: any[]): any[] {
    return (raw ?? []).map(r => {
      const s = r?.student ?? r;
      const u = s?.user ?? r?.user ?? {};
      const first = u.firstName ?? s?.firstName ?? '';
      const last = u.lastName ?? s?.lastName ?? '';
      const fullName = `${first} ${last}`.trim() || s?.name || '(sin nombre)';
      return {
        id: s?.id ?? r?.studentId ?? r?.id ?? '',
        code: s?.studentCode ?? s?.code ?? '',
        name: fullName,
        email: u.email ?? s?.email ?? '',
        average: s?.averageGrade ?? r?.averageGrade ?? '—',
        status: s?.status ?? u?.status ?? 'ACTIVE',
      };
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
    this.teacherService.getTasks(this.apiTeacherAssignmentId()).subscribe({
      next: (data) => this.tasks.set(data)
    });
  }

  loadGrades() {
    this.teacherService.getGrades(this.apiTeacherAssignmentId()).subscribe({
      next: (data) => this.grades.set(data)
    });
  }

  loadAttendance() {
    this.teacherService.getAttendanceHistory(this.apiTeacherAssignmentId()).subscribe({
      next: (data) => this.attendance.set(data)
    });
  }

  loadMaterials() {
    this.teacherService.getMaterials(this.apiTeacherAssignmentId()).subscribe({
      next: (data) => this.materials.set(data)
    });
  }

  deleteTask(taskId: string) {
    if (!confirm('¿Eliminar tarea?')) return;
    this.teacherService.deleteTask(this.apiTeacherAssignmentId(), taskId).subscribe({
      next: () => this.loadTasks()
    });
  }

  deleteMaterial(materialId: string) {
    if (!confirm('¿Eliminar material?')) return;
    this.teacherService.deleteMaterial(this.apiTeacherAssignmentId(), materialId).subscribe({
      next: () => this.loadMaterials()
    });
  }

  getCourseName(): string { return this.course()?.course?.name ?? ''; }

  /** "Grado · Nivel" del curso. El sistema usa "un grado = un curso" (sin secciones). */
  getGradeLabel(): string {
    const c = this.course();
    if (!c) return '';
    const grade = (c.course?.grade ?? '').trim();
    const level = (c.course?.level ?? '').trim();
    return [grade, level].filter(Boolean).join(' · ');
  }

  getCourseSubtitleParts(): string {
    const c = this.course();
    if (!c) return '';
    const code = c.code ?? c.course?.code ?? '';
    const rest = this.getGradeLabel();
    return [code ? String(code) : '', rest].filter(Boolean).join(' · ');
  }

  formatScheduleHint(): string {
    const sched = this.course()?.course?.schedule;
    if (!sched?.length) return '—';
    return sched
      .slice(0, 3)
      .map(s => `${s.day ?? ''} ${s.startTime ?? ''}-${s.endTime ?? ''}`.trim())
      .filter(Boolean)
      .join(' · ') || '—';
  }

  setTab(tab: TabType) { this.selectTab(tab); }
}
