import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Child {
  id: string;
  name: string;
  grade: string;
  section: string;
  photo?: string;
}

interface Alert {
  id: string;
  type: 'tarea' | 'falta' | 'nota' | 'pago';
  title: string;
  message: string;
  date: string;
  childId: string;
  urgent: boolean;
}

@Component({
  selector: 'app-dashboard-padre',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-padre.component.html',
  styleUrl: './dashboard-padre.component.css'
})
export class DashboardPadreComponent {
  selectedChild = signal<string>('1');
  
  children = signal<Child[]>([
    { id: '1', name: 'María Rodríguez', grade: '3ro', section: 'A' },
    { id: '2', name: 'Pedro Rodríguez', grade: '1ro', section: 'B' }
  ]);

  alerts = signal<Alert[]>([
    { id: '1', type: 'tarea', title: 'Tarea vencida', message: 'Matemática - Tarea pendiente desde hace 2 días', date: '2024-03-08', childId: '1', urgent: true },
    { id: '2', type: 'falta', title: 'Falta registrada', message: 'María tuvo una falta el día de hoy', date: '2024-03-10', childId: '1', urgent: false },
    { id: '3', type: 'nota', title: 'Nota baja', message: 'Pedro obtuvo una nota baja en Lengua', date: '2024-03-09', childId: '2', urgent: false }
  ]);

  // KPIs del hijo seleccionado
  todayAttendance = signal({ present: true, time: '08:15' });
  weekAttendance = signal({ present: 4, total: 5, percentage: 80 });
  pendingTasks = signal(3);
  upcomingEvaluations = signal(2);
  recentComunicados = signal(3);

  selectedChildData = computed(() => {
    return this.children().find(c => c.id === this.selectedChild());
  });

  filteredAlerts = computed(() => {
    return this.alerts().filter(a => a.childId === this.selectedChild());
  });

  urgentAlerts = computed(() => {
    return this.filteredAlerts().filter(a => a.urgent);
  });

  selectChild(childId: string) {
    this.selectedChild.set(childId);
  }
}
