import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-notas-padre',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notas-padre.component.html',
  styleUrl: './notas-padre.component.css'
})
export class NotasPadreComponent {
  selectedChild = signal('1');
  
  children = signal([
    { id: '1', name: 'María Rodríguez', grade: '3ro', section: 'A' }
  ]);

  overallAverage = signal(15.2);

  courses = signal([
    { id: '1', name: 'Matemática', average: 15.5, period1: 15, period2: 16, period3: 15, period4: 16 },
    { id: '2', name: 'Lengua y Literatura', average: 16.0, period1: 16, period2: 16, period3: 16, period4: 16 },
    { id: '3', name: 'Ciencias', average: 14.5, period1: 14, period2: 15, period3: 14, period4: 15 }
  ]);

  periods = signal(['Bimestre 1', 'Bimestre 2', 'Bimestre 3', 'Bimestre 4']);

  downloadBoleta() {
    console.log('Descargar boleta');
  }
}
