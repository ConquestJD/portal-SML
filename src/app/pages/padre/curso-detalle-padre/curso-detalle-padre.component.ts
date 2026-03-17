import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ParentService } from '../../../services/parent.service';

type TabType = 'materiales' | 'tareas';

@Component({
  selector: 'app-curso-detalle-padre',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './curso-detalle-padre.component.html',
  styleUrl: './curso-detalle-padre.component.css'
})
export class CursoDetallePadreComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  readonly isLoading = this.loading;
  childId = '';
  courseId = '';
  activeTab = signal<TabType>('materiales');

  course = signal<unknown>(null);
  units = signal<unknown[]>([]);
  tasks = signal<unknown[]>([]);

  constructor(private route: ActivatedRoute, private parentService: ParentService) {}

  ngOnInit() {
    this.childId = this.route.snapshot.queryParamMap.get('childId') ?? '';
    this.courseId = this.route.snapshot.paramMap.get('id') ?? '';

    if (this.childId) {
      this.parentService.getChildCourse(this.childId, this.courseId).subscribe({
        next: (data) => { this.course.set(data); this.loading.set(false); this.loadUnits(); },
        error: () => { this.error.set('Error al cargar el curso'); this.loading.set(false); }
      });
    } else {
      this.loading.set(false);
    }
  }

  loadUnits() {
    if (!this.childId) return;
    this.parentService.getChildCourseUnits(this.childId, this.courseId).subscribe({
      next: (data) => this.units.set(data)
    });
  }

  selectTab(tab: TabType) {
    this.activeTab.set(tab);
    if (tab === 'tareas') this.loadTasks();
  }

  loadTasks() {
    if (!this.childId) return;
    this.parentService.getChildCourseTasks(this.childId, this.courseId).subscribe({
      next: (data) => this.tasks.set(data)
    });
  }
}
