import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent {
  activeTab = signal<'personal' | 'academico' | 'foto'>('personal');

  studentData = signal({
    photo: 'https://via.placeholder.com/150',
    fullName: 'Juan Pérez García',
    code: 'EST-2024-001',
    grade: '3ro',
    section: 'A',
    dni: '12345678',
    birthDate: '15/05/2008',
    age: 16,
    address: 'Av. Principal 123',
    phone: '+51 987654321',
    email: 'juan.perez@colegio.edu',
    tutor: 'María Pérez',
    emergencyPhone: '+51 987654322'
  });

  academicData = signal({
    academicYear: '2024',
    grade: '3ro',
    section: 'A',
    shift: 'Mañana',
    admissionDate: '01/03/2020',
    historicalAverage: 16.2,
    status: 'Regular'
  });

  setTab(tab: 'personal' | 'academico' | 'foto') {
    this.activeTab.set(tab);
  }
}
