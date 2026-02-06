import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-detalle-profesor',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './detalle-profesor.component.html',
  styleUrl: './detalle-profesor.component.css'
})
export class DetalleProfesorComponent {
  profesorId = signal('');
  activeTab = signal<'perfil' | 'cursos' | 'historial' | 'permisos'>('perfil');

  profesor = signal({
    id: '1',
    name: 'Prof. Ana Martínez',
    email: 'ana@colegio.edu',
    status: 'activo',
    department: 'Matemática'
  });

  courses = signal([
    { id: '1', name: 'Matemática - 3ro A', students: 30 },
    { id: '2', name: 'Matemática - 3ro B', students: 28 }
  ]);

  constructor(private route: ActivatedRoute) {
    this.route.params.subscribe(params => {
      this.profesorId.set(params['id']);
    });
  }

  setTab(tab: 'perfil' | 'cursos' | 'historial' | 'permisos') {
    this.activeTab.set(tab);
  }
}
