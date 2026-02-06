import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Component for institutional announcements

@Component({
  selector: 'app-comunicados-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './comunicados-admin.component.html',
  styleUrl: './comunicados-admin.component.css'
})
export class ComunicadosAdminComponent {
  comunicados = signal([
    { id: '1', title: 'Reunión de Padres', type: 'institucional', date: '2024-03-10', status: 'publicado' }
  ]);

  createComunicado() {
    console.log('Crear comunicado');
  }
}
