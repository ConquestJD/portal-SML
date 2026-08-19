import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  DashboardService,
  ParentDashboard,
  ParentDashboardComunicado,
} from '../../../services/dashboard.service';
import { ParentService, Child } from '../../../services/parent.service';

@Component({
  selector: 'app-dashboard-padre',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-padre.component.html',
  styleUrl: './dashboard-padre.component.css',
})
export class DashboardPadreComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedChildId = signal('');

  children = signal<Child[]>([]);
  dashboardData = signal<ParentDashboard | null>(null);

  pendingTasks = signal(0);
  unreadComunicados = signal(0);
  recentComunicadosList = signal<ParentDashboardComunicado[]>([]);

  todayAttendance = signal<{ label: string; status: string | null; sessionCount: number }>({
    label: '—',
    status: null,
    sessionCount: 0,
  });
  weekAttendance = signal<{ present: number; total: number; percentage: number }>({
    present: 0,
    total: 0,
    percentage: 0,
  });
  urgentAlerts = signal<ParentDashboard['alerts']>([]);

  selectedChildData = computed(() => this.children().find((c) => c.id === this.selectedChildId()));

  readonly shortcuts = [
    { label: 'Perfil del hijo', link: '/padre/perfil-hijo' },
    { label: 'Cursos', link: '/padre/cursos' },
    { label: 'Mensajería', link: '/padre/mensajeria' },
    { label: 'Pagos', link: '/padre/pagos' },
  ];

  constructor(
    private dashboardService: DashboardService,
    private parentService: ParentService,
  ) {}

  ngOnInit() {
    this.parentService.getChildren().subscribe({
      next: (children) => {
        this.children.set(children);
        if (children.length) {
          this.selectedChildId.set(children[0].id);
          this.loadDashboard(children[0].id);
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.error.set('Error al cargar hijos');
        this.loading.set(false);
      },
    });
  }

  selectChild(childId: string) {
    this.selectedChildId.set(childId);
    this.loadDashboard(childId);
  }

  private applyDashboard(data: ParentDashboard) {
    this.dashboardData.set(data);
    this.pendingTasks.set(data.summary.pendingTasks);
    this.unreadComunicados.set(data.summary.unreadComunicados);
    this.todayAttendance.set({
      label: data.attendance?.today?.label ?? '—',
      status: data.attendance?.today?.status ?? null,
      sessionCount: data.attendance?.today?.sessionCount ?? 0,
    });
    const w = data.attendance?.week;
    this.weekAttendance.set({
      present: w?.present ?? 0,
      total: w?.total ?? 0,
      percentage: w?.percentage ?? 0,
    });
    this.recentComunicadosList.set(data.recentComunicados ?? []);
    this.urgentAlerts.set(data.alerts ?? []);
  }

  loadDashboard(childId: string) {
    this.error.set('');
    this.dashboardService.getParentDashboard(childId).subscribe({
      next: (data) => {
        this.applyDashboard(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar el resumen');
        this.loading.set(false);
      },
    });
  }

  formatComunicadoDate(d: string | Date | null): string {
    if (d == null) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  attendanceTodayClass(): 'present' | 'absent' | 'neutral' {
    const s = this.todayAttendance().status;
    if (s === 'ABSENT') return 'absent';
    if (s === 'PRESENT' || s === 'LATE') return 'present';
    return 'neutral';
  }

  getChildName(child: Child): string {
    return `${child.user.firstName} ${child.user.lastName}`;
  }

  getChildGrade(child: Child): string {
    return child.grade ?? child.enrollments?.[0]?.section?.grade ?? '';
  }

  getChildInitial(child: Child): string {
    const fn = child.user?.firstName?.charAt(0) ?? '';
    const ln = child.user?.lastName?.charAt(0) ?? '';
    return (fn + ln).toUpperCase() || '?';
  }
}
