import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-comunicados-profesor',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './comunicados-profesor.component.html',
  styleUrl: './comunicados-profesor.component.css'
})
export class ComunicadosProfesorComponent {
  filter = signal<'todos' | 'publicados' | 'borradores'>('todos');

  comunicados = signal([
    {
      id: '1',
      title: 'Recordatorio: Examen Parcial',
      course: 'Matemática - 3ro A',
      courseId: '1',
      date: '2024-03-18',
      status: 'publicado',
      urgent: true
    },
    {
      id: '2',
      title: 'Material de Estudio Disponible',
      course: 'Matemática - 3ro B',
      courseId: '2',
      date: '2024-03-17',
      status: 'publicado',
      urgent: false
    }
  ]);
}
