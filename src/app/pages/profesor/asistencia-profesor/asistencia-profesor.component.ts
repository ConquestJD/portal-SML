import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-asistencia-profesor',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './asistencia-profesor.component.html',
  styleUrl: './asistencia-profesor.component.css'
})
export class AsistenciaProfesorComponent {
  selectedCourse = signal('');
  selectedDate = signal(new Date().toISOString().split('T')[0]);

  courses = signal([
    { id: '1', name: 'Matemática - 3ro A', code: 'MAT-2024', pending: 3 },
    { id: '2', name: 'Matemática - 3ro B', code: 'MAT-2024', pending: 2 },
    { id: '3', name: 'Matemática - 4to A', code: 'MAT-2024', pending: 3 }
  ]);

  totalPending = signal(8);
}
