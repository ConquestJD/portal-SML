import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-asistencia-padre',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './asistencia-padre.component.html',
  styleUrl: './asistencia-padre.component.css'
})
export class AsistenciaPadreComponent {
  selectedChild = signal('1');
  
  children = signal([
    { id: '1', name: 'María Rodríguez', grade: '3ro', section: 'A' }
  ]);

  attendanceSummary = signal({
    present: 45,
    absent: 3,
    late: 2,
    percentage: 90
  });

  attendanceRecords = signal([
    { date: '2024-03-10', status: 'presente', time: '08:15', observation: '' },
    { date: '2024-03-09', status: 'ausente', time: '-', observation: 'Falta justificada' },
    { date: '2024-03-08', status: 'tardanza', time: '08:45', observation: 'Llegó tarde' }
  ]);

  requestJustification() {
    console.log('Solicitar justificación');
  }
}
