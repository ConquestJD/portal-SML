import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-notas-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './notas-profesor.component.html',
  styleUrl: './notas-profesor.component.css'
})
export class NotasProfesorComponent {
  selectedCourse = signal('');

  courses = signal([
    { id: '1', name: 'Matemática - 3ro A', code: 'MAT-2024' },
    { id: '2', name: 'Matemática - 3ro B', code: 'MAT-2024' },
    { id: '3', name: 'Matemática - 4to A', code: 'MAT-2024' }
  ]);

  students = signal([
    { id: '1', name: 'Juan Pérez', code: '2024001', evaluations: [
      { name: 'Examen Parcial 1', grade: 17, weight: 30 },
      { name: 'Práctica 1', grade: 16, weight: 20 },
      { name: 'Tarea 1', grade: 18, weight: 10 }
    ], average: 16.8 },
    { id: '2', name: 'María García', code: '2024002', evaluations: [
      { name: 'Examen Parcial 1', grade: 18, weight: 30 },
      { name: 'Práctica 1', grade: 17, weight: 20 },
      { name: 'Tarea 1', grade: 19, weight: 10 }
    ], average: 17.8 }
  ]);
}
