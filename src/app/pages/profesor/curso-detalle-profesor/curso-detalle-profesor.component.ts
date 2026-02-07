import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MensajeriaCursoComponent } from '../../mensajeria-curso/mensajeria-curso.component';

@Component({
  selector: 'app-curso-detalle-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MensajeriaCursoComponent],
  templateUrl: './curso-detalle-profesor.component.html',
  styleUrl: './curso-detalle-profesor.component.css'
})
export class CursoDetalleProfesorComponent {
  courseId = signal('');
  activeTab = signal<'estudiantes' | 'tareas' | 'notas' | 'asistencia' | 'material' | 'comunicados' | 'mensajes'>('estudiantes');
  searchQuery = signal('');

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
    { id: '1', name: 'Juan Pérez', code: '2024001', average: 16.5, status: 'active', email: 'juan@colegio.edu', tutor: 'María Pérez' },
    { id: '2', name: 'María García', code: '2024002', average: 18.0, status: 'active', email: 'maria@colegio.edu', tutor: 'Carlos García' },
    { id: '3', name: 'Carlos López', code: '2024003', average: 15.2, status: 'active', email: 'carlos@colegio.edu', tutor: 'Ana López' }
  ]);

  filteredStudents = signal(this.students());

  tasks = signal([
    { id: '1', title: 'Álgebra Lineal', dueDate: '2024-03-25', submitted: 25, pending: 5, status: 'active' },
    { id: '2', title: 'Geometría', dueDate: '2024-03-28', submitted: 20, pending: 10, status: 'active' }
  ]);

  constructor(private route: ActivatedRoute) {
    this.route.params.subscribe(params => {
      this.courseId.set(params['id']);
    });
    
    // Leer query params para activar tab específico
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const tab = params['tab'] as 'estudiantes' | 'tareas' | 'notas' | 'asistencia' | 'material' | 'comunicados' | 'mensajes';
        if (['estudiantes', 'tareas', 'notas', 'asistencia', 'material', 'comunicados', 'mensajes'].includes(tab)) {
          this.activeTab.set(tab);
        }
      }
    });
  }

  setTab(tab: 'estudiantes' | 'tareas' | 'notas' | 'asistencia' | 'material' | 'comunicados' | 'mensajes') {
    this.activeTab.set(tab);
  }

  onSearchStudents() {
    const query = this.searchQuery().toLowerCase();
    if (!query) {
      this.filteredStudents.set(this.students());
      return;
    }
    this.filteredStudents.set(
      this.students().filter(student =>
        student.name.toLowerCase().includes(query) ||
        student.code.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query)
      )
    );
  }
}
