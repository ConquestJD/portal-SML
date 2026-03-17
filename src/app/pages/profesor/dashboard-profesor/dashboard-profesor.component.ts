import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService, TeacherDashboard } from '../../../services/dashboard.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-dashboard-profesor',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-profesor.component.html',
  styleUrl: './dashboard-profesor.component.css'
})
export class DashboardProfesorComponent implements OnInit {
  loading = signal(true);
  error = signal('');

  teacherName = signal('Profesor');
  specialty = signal('');
  department = signal('');
  totalCourses = signal(0);
  totalStudents = signal(0);
  pendingGrading = signal(0);
  attendancePending = signal(0);
  alerts = signal<unknown[]>([]);
  recentActivity = signal<unknown[]>([]);

  quickAccess = signal([
    { icon: 'fas fa-book', title: 'Mis Cursos', link: '/profesor/cursos', count: 0 },
    { icon: 'fas fa-tasks', title: 'Tareas', link: '/profesor/tareas', count: 0 },
    { icon: 'fas fa-chart-line', title: 'Calificaciones', link: '/profesor/notas' },
    { icon: 'fas fa-calendar-alt', title: 'Asistencia', link: '/profesor/asistencia', count: 0 },
    { icon: 'fas fa-users', title: 'Estudiantes', link: '/profesor/cursos' },
    { icon: 'fas fa-bullhorn', title: 'Comunicados', link: '/comunicados' }
  ]);

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const user = this.authService.user();
    if (user) this.teacherName.set(user.name);

    this.dashboardService.getTeacherDashboard().subscribe({
      next: (data: TeacherDashboard) => {
        this.totalCourses.set(data.summary.totalCourses);
        this.totalStudents.set(data.summary.totalStudents);
        this.pendingGrading.set(data.summary.pendingGrading);
        this.attendancePending.set(data.summary.attendancePending);
        if (data.teacher?.specialty) this.specialty.set(data.teacher.specialty);
        this.quickAccess.update(qa => qa.map(item => {
          if (item.title === 'Mis Cursos') return { ...item, count: data.summary.totalCourses };
          if (item.title === 'Tareas') return { ...item, count: data.summary.pendingGrading };
          if (item.title === 'Asistencia') return { ...item, count: data.summary.attendancePending };
          return item;
        }));
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar dashboard'); this.loading.set(false); }
    });
  }

  getCurrentDate() {
    return new Date().toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }
}
