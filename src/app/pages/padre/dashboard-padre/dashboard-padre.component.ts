import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService, ParentDashboard } from '../../../services/dashboard.service';
import { ParentService, Child } from '../../../services/parent.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-dashboard-padre',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-padre.component.html',
  styleUrl: './dashboard-padre.component.css'
})
export class DashboardPadreComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedChildId = signal('');

  children = signal<Child[]>([]);
  dashboardData = signal<ParentDashboard | null>(null);

  pendingTasks = signal(0);
  recentComunicados = signal(0);
  todayAttendance = signal<{ present: boolean; time?: string; status?: string }>({ present: true });
  upcomingEvaluations = signal<any[]>([]);
  urgentAlerts = signal<any[]>([]);
  weekAttendance = signal<{ present: number; total: number; percentage: number }>({ present: 0, total: 0, percentage: 0 });

  selectedChildData = computed(() =>
    this.children().find(c => c.id === this.selectedChildId())
  );

  constructor(
    private dashboardService: DashboardService,
    private parentService: ParentService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.parentService.getChildren().subscribe({
      next: (children) => {
        this.children.set(children);
        if (children.length) {
          this.selectedChildId.set(children[0].id);
          this.loadDashboard(children[0].id);
        }
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar hijos'); this.loading.set(false); }
    });
  }

  selectChild(childId: string) {
    this.selectedChildId.set(childId);
    this.loadDashboard(childId);
  }

  loadDashboard(childId: string) {
    this.dashboardService.getParentDashboard(childId).subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.pendingTasks.set(data.summary.pendingTasks);
        this.recentComunicados.set(data.summary.recentComunicados);
      }
    });
  }

  getChildName(child: Child): string {
    return `${child.user.firstName} ${child.user.lastName}`;
  }

  getChildGrade(child: Child): string {
    return child.enrollments?.[0]?.section?.grade ?? '';
  }
}
