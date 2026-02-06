import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Component for reports generation

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css'
})
export class ReportesComponent {
  reportTypes = signal([
    { id: '1', name: 'Reporte de Notas', icon: 'fas fa-chart-line' },
    { id: '2', name: 'Reporte de Asistencia', icon: 'fas fa-calendar-check' },
    { id: '3', name: 'Reporte de Rendimiento', icon: 'fas fa-chart-bar' },
    { id: '4', name: 'Actividad del Portal', icon: 'fas fa-chart-pie' }
  ]);

  generateReport(reportId: string) {
    console.log('Generar reporte', reportId);
  }
}
