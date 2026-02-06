import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Component for grades and sections management

@Component({
  selector: 'app-grados-secciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './grados-secciones.component.html',
  styleUrl: './grados-secciones.component.css'
})
export class GradosSeccionesComponent {
  levels = signal([
    { id: '1', name: 'Secundaria', grades: ['1ro', '2do', '3ro', '4to', '5to'] }
  ]);

  sections = signal([
    { id: '1', grade: '3ro', section: 'A', capacity: 30, enrolled: 28 },
    { id: '2', grade: '3ro', section: 'B', capacity: 30, enrolled: 25 }
  ]);

  createSection() {
    console.log('Crear nueva sección');
  }
}
