import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-curso-detalle-padre',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './curso-detalle-padre.component.html',
  styleUrl: './curso-detalle-padre.component.css'
})
export class CursoDetallePadreComponent {
  course = signal({
    id: '1',
    code: 'MAT-2024',
    name: 'Matemática',
    teacher: 'Prof. Ana Martínez',
    schedule: 'Lun, Mié, Vie 8:00-9:30',
    average: 15.5
  });

  materials = signal([
    { id: '1', title: 'Guía de Álgebra', type: 'pdf', date: '2024-03-05', size: '2.5 MB' },
    { id: '2', title: 'Presentación: Ecuaciones', type: 'ppt', date: '2024-03-08', size: '5.2 MB' }
  ]);

  tasks = signal([
    { id: '1', title: 'Tarea: Ejercicios de Álgebra', dueDate: '2024-03-15', status: 'pendiente', submitted: false },
    { id: '2', title: 'Proyecto: Resolución de Problemas', dueDate: '2024-03-10', status: 'entregada', submitted: true, submittedDate: '2024-03-09' }
  ]);

  evaluations = signal([
    { id: '1', title: 'Examen Parcial', date: '2024-03-20', type: 'examen' },
    { id: '2', title: 'Evaluación Continua', date: '2024-03-25', type: 'continua' }
  ]);

  comunicados = signal([
    { id: '1', title: 'Recordatorio: Entrega de Tarea', date: '2024-03-08', read: true },
    { id: '2', title: 'Cambio de Fecha de Examen', date: '2024-03-10', read: false }
  ]);

  constructor(private route: ActivatedRoute) {
    const courseId = this.route.snapshot.paramMap.get('id');
    // Aquí cargarías los datos del curso según el ID
  }
}
