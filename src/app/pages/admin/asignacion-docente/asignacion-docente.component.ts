import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Component for teacher assignment

@Component({
  selector: 'app-asignacion-docente',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './asignacion-docente.component.html',
  styleUrl: './asignacion-docente.component.css'
})
export class AsignacionDocenteComponent {
  assignments = signal([
    { id: '1', teacher: 'Prof. Ana Martínez', course: 'Matemática', grade: '3ro', section: 'A', students: 30 }
  ]);

  assignTeacher() {
    console.log('Asignar profesor');
  }
}
