import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-curso-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './curso-detalle.component.html',
  styleUrl: './curso-detalle.component.css'
})
export class CursoDetalleComponent {
  activeTab = signal<'contenido' | 'materiales' | 'tareas' | 'calificaciones'>('contenido');
  
  course = signal({
    id: '1',
    name: 'Matemática',
    code: 'MAT-2024',
    teacher: 'Prof. Carlos Rodríguez',
    teacherPhoto: 'https://via.placeholder.com/40',
    period: '2024',
    average: 16.5
  });

  materials = signal([
    { id: '1', name: 'Unidad 1 - Álgebra', type: 'PDF', size: '2.5 MB', date: '2024-03-01' },
    { id: '2', name: 'Video: Ecuaciones', type: 'Video', size: '45 MB', date: '2024-03-05' }
  ]);

  tasks = signal([
    { id: '1', name: 'Tarea 1: Problemas de Álgebra', status: 'entregada', dueDate: '2024-03-15', grade: 18 },
    { id: '2', name: 'Tarea 2: Geometría', status: 'pendiente', dueDate: '2024-03-25', grade: null }
  ]);

  setTab(tab: 'contenido' | 'materiales' | 'tareas' | 'calificaciones') {
    this.activeTab.set(tab);
  }
}
