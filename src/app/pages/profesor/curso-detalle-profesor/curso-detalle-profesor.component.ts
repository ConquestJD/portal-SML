import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-curso-detalle-profesor',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './curso-detalle-profesor.component.html',
  styleUrl: './curso-detalle-profesor.component.css'
})
export class CursoDetalleProfesorComponent {
  courseId = signal('');
  activeTab = signal<'estudiantes' | 'tareas' | 'notas' | 'asistencia' | 'material'>('estudiantes');

  course = signal({
    id: '1',
    code: 'MAT-2024',
    name: 'Matemática',
    grade: '3ro',
    section: 'A',
    students: 30,
    schedule: 'Lunes y Miércoles 8:00 - 10:00'
  });

  students = signal([
    { id: '1', name: 'Juan Pérez', code: '2024001', average: 16.5, status: 'active' },
    { id: '2', name: 'María García', code: '2024002', average: 18.0, status: 'active' },
    { id: '3', name: 'Carlos López', code: '2024003', average: 15.2, status: 'active' }
  ]);

  tasks = signal([
    { id: '1', title: 'Álgebra Lineal', dueDate: '2024-03-25', submitted: 25, pending: 5, status: 'active' },
    { id: '2', title: 'Geometría', dueDate: '2024-03-28', submitted: 20, pending: 10, status: 'active' }
  ]);

  constructor(private route: ActivatedRoute) {
    this.route.params.subscribe(params => {
      this.courseId.set(params['id']);
    });
  }

  setTab(tab: 'estudiantes' | 'tareas' | 'notas' | 'asistencia' | 'material') {
    this.activeTab.set(tab);
  }
}
