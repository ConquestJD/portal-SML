import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-notas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notas.component.html',
  styleUrl: './notas.component.css'
})
export class NotasComponent {
  selectedPeriod = signal('2024');
  selectedCourse = signal('todos');

  generalAverage = signal(16.5);
  previousAverage = signal(16.0);

  courses = signal([
    { id: '1', name: 'Matemática', average: 16.5 },
    { id: '2', name: 'Lengua y Literatura', average: 18.0 },
    { id: '3', name: 'Ciencias', average: 17.2 }
  ]);

  evaluations = signal([
    { type: 'Examen Parcial', description: 'Unidad 1-3', date: '2024-03-10', points: 100, obtained: 85, percentage: 85 },
    { type: 'Tarea', description: 'Proyecto Final', date: '2024-03-15', points: 50, obtained: 45, percentage: 90 }
  ]);
}
