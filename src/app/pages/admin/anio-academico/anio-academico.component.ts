import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Component for academic year management

@Component({
  selector: 'app-anio-academico',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './anio-academico.component.html',
  styleUrl: './anio-academico.component.css'
})
export class AnioAcademicoComponent {
  academicYears = signal([
    { id: '1', year: '2024', status: 'activo', startDate: '2024-03-01', endDate: '2024-12-15', periods: 4 }
  ]);

  createNewYear() {
    console.log('Crear nuevo año académico');
  }
}
