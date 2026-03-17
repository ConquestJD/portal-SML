import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, TeacherItem } from '../../../services/admin.service';

@Component({
  selector: 'app-detalle-profesor',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, FormsModule],
  templateUrl: './detalle-profesor.component.html',
  styleUrl: './detalle-profesor.component.css'
})
export class DetalleProfesorComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  activeTab = signal('perfil');
  teacherId = '';

  teacher = signal<TeacherItem | null>(null);
  activeCourses = signal<unknown[]>([]);
  courseHistory = signal<unknown[]>([]);

  constructor(private route: ActivatedRoute, private adminService: AdminService) {}

  ngOnInit() {
    this.teacherId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadTeacher();
  }

  loadTeacher() {
    this.loading.set(true);
    this.adminService.getTeacher(this.teacherId).subscribe({
      next: (data) => { this.teacher.set(data); this.loading.set(false); },
      error: () => { this.error.set('No se pudo cargar el profesor'); this.loading.set(false); }
    });
  }

  selectTab(tab: string) {
    this.activeTab.set(tab);
    if (tab === 'cursos') this.loadActiveCourses();
    if (tab === 'historial') this.loadCourseHistory();
  }

  loadActiveCourses() {
    this.adminService.getTeacherActiveCourses(this.teacherId).subscribe({
      next: (data) => this.activeCourses.set(data)
    });
  }

  loadCourseHistory() {
    this.adminService.getTeacherCourseHistory(this.teacherId).subscribe({
      next: (data) => this.courseHistory.set(data)
    });
  }

  unassignCourse(courseId: string) {
    this.adminService.unassignCourseFromTeacher(this.teacherId, courseId).subscribe({
      next: () => this.loadActiveCourses()
    });
  }

  setTab(tab: string) { this.selectTab(tab); }
  getFullName(): string {
    const t = this.teacher();
    if (!t) return '';
    return t.name ?? `${t.user.firstName} ${t.user.lastName}`;
  }
  readonly profesor = computed(() => this.teacher() ?? {
    name: '', department: '', specialty: '', email: '', phone: '', status: '',
    teacherCode: '', bio: '',
    user: { id: '', email: '', firstName: '', lastName: '', status: '' }
  } as any);
  showAssignCourseModal = signal(false);
  openAssignCourseModal() { this.showAssignCourseModal.set(true); }
  closeAssignCourseModal() { this.showAssignCourseModal.set(false); }
}
