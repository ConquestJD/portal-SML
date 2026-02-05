import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asistencia.component.html',
  styleUrl: './asistencia.component.css'
})
export class AsistenciaComponent {
  selectedMonth = signal('2024-03');
  selectedCourse = signal('todos');

  summary = signal({
    attendancePercentage: 95,
    daysAttended: 19,
    absences: 1,
    tardies: 0
  });

  attendanceRecords = signal([
    { date: '2024-03-15', course: 'Matemática', status: 'presente', timeIn: '08:00', timeOut: '09:30' },
    { date: '2024-03-16', course: 'Lengua', status: 'falta', timeIn: '-', timeOut: '-' },
    { date: '2024-03-17', course: 'Ciencias', status: 'tardanza', timeIn: '08:15', timeOut: '10:00' }
  ]);
}
