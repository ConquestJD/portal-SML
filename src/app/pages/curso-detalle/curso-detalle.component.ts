import { Component, signal, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private studentService: StudentService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.courseId.set(id);

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const tab = this.tabFromQuery(params.get('tab')) ?? 'contenido';
      if (tab !== this.activeTab()) {
        this.activeTab.set(tab);
        if (tab === 'tareas') this.loadTasks();
        if (tab === 'calificaciones') this.loadGrades();
      }
    });

    this.loadCourse();
    this.loadUnits();
  }

  private tabFromQuery(raw: string | null): TabType | null {
    if (!raw) return null;
    const allowed: TabType[] = ['contenido', 'tareas', 'calificaciones', 'comunicados', 'mensajes', 'foros', 'compañeros'];
    return allowed.includes(raw as TabType) ? (raw as TabType) : null;
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

  downloadMaterial(material: { id?: string }) {
    const mid = material?.id;
    if (mid) {
      window.open(this.studentService.getMaterialDownloadUrl(this.courseId(), mid));
    }
  }

  getCourseName(): string { return this.course()?.course.name ?? ''; }

  setTab(tab: TabType) {
    this.selectTab(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'contenido' ? null : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  taskStatusLabel(task: StudentTask): string {
    const st = (task.submission?.status ?? task.status ?? '').toUpperCase();
    if (st === 'SUBMITTED' || st === 'GRADED') return 'Entregada';
    return 'Pendiente';
  }

  taskIsDone(task: StudentTask): boolean {
    const st = (task.submission?.status ?? task.status ?? '').toUpperCase();
    return st === 'SUBMITTED' || st === 'GRADED' || st === 'APPROVED';
  }

  formatGradeDate(g: StudentGrade): string {
    if (!g.createdAt) return '—';
    const d = new Date(g.createdAt);
    return Number.isNaN(d.getTime()) ? g.createdAt : d.toLocaleDateString('es-PE');
  }

  gradesCourseAverage(): string {
    const list = this.grades();
    if (!list.length) return '—';
    const avg = list.reduce((a, g) => a + (g.score ?? 0), 0) / list.length;
    return String(Math.round(avg * 20) / 20);
  }

  toggleUnit(unitId: string) {
    this.units.update((list) =>
      (list as Record<string, unknown>[]).map((u) =>
        String(u['id']) === unitId ? { ...u, isExpanded: !Boolean(u['isExpanded']) } : u,
      ),
    );
  }
}
