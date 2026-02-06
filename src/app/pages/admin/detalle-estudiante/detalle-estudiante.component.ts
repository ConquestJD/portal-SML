import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-detalle-estudiante',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './detalle-estudiante.component.html',
  styleUrl: './detalle-estudiante.component.css'
})
export class DetalleEstudianteComponent {
  studentId = signal('');
  activeTab = signal<'perfil' | 'academico' | 'notas' | 'asistencia' | 'documentos'>('perfil');

  student = signal({
    id: '1',
    name: 'Juan Pérez',
    code: '2024001',
    email: 'juan@colegio.edu',
    dni: '12345678',
    grade: '3ro',
    section: 'A',
    status: 'activo',
    enrollmentDate: '2024-01-15',
    address: 'Av. Principal 123',
    phone: '+51 987654321',
    tutor: 'María Pérez',
    emergencyPhone: '+51 987654322'
  });

  constructor(private route: ActivatedRoute) {
    this.route.params.subscribe(params => {
      this.studentId.set(params['id']);
    });
  }

  setTab(tab: 'perfil' | 'academico' | 'notas' | 'asistencia' | 'documentos') {
    this.activeTab.set(tab);
  }
}
