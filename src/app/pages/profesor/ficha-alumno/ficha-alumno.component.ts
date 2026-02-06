import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-ficha-alumno',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ficha-alumno.component.html',
  styleUrl: './ficha-alumno.component.css'
})
export class FichaAlumnoComponent {
  courseId = signal('');
  studentId = signal('');

  student = signal({
    id: '1',
    name: 'Juan Pérez',
    code: '2024001',
    email: 'juan@colegio.edu',
    tutor: 'María Pérez',
    tutorEmail: 'maria.perez@email.com',
    tutorPhone: '+51 999 888 777'
  });

  course = signal({
    id: '1',
    name: 'Matemática',
    code: 'MAT-2024',
    grade: '3ro',
    section: 'A'
  });

  // Datos académicos del estudiante en este curso
  academicData = signal({
    average: 16.5,
    totalTasks: 10,
    completedTasks: 8,
    pendingTasks: 2,
    attendancePercentage: 95,
    totalAbsences: 2,
    totalLates: 1
  });

  tasks = signal([
    { id: '1', title: 'Álgebra Lineal', status: 'entregada', grade: 18, dueDate: '2024-03-15', submittedDate: '2024-03-14' },
    { id: '2', title: 'Geometría', status: 'pendiente', grade: null, dueDate: '2024-03-25', submittedDate: null },
    { id: '3', title: 'Cálculo', status: 'entregada', grade: 16, dueDate: '2024-03-10', submittedDate: '2024-03-10' }
  ]);

  evaluations = signal([
    { id: '1', name: 'Examen Parcial 1', type: 'Examen', grade: 17, weight: 30, date: '2024-03-20' },
    { id: '2', name: 'Práctica Calificada 1', type: 'Práctica', grade: 16, weight: 20, date: '2024-03-12' }
  ]);

  attendance = signal([
    { date: '2024-03-18', status: 'presente', observation: '' },
    { date: '2024-03-15', status: 'falta', observation: 'Justificada' },
    { date: '2024-03-13', status: 'tarde', observation: 'Llegó 10 minutos tarde' }
  ]);

  observations = signal([
    { date: '2024-03-18', text: 'Excelente participación en clase', author: 'Prof. María González' },
    { date: '2024-03-10', text: 'Necesita reforzar conceptos de álgebra', author: 'Prof. María González' }
  ]);

  constructor(private route: ActivatedRoute) {
    this.route.params.subscribe(params => {
      this.courseId.set(params['courseId']);
      this.studentId.set(params['studentId']);
    });
  }
}
