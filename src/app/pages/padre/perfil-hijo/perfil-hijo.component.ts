import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-perfil-hijo',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './perfil-hijo.component.html',
  styleUrl: './perfil-hijo.component.css'
})
export class PerfilHijoComponent {
  selectedChild = signal('1');
  
  children = signal([
    { id: '1', name: 'María Rodríguez', grade: '3ro', section: 'A', photo: 'https://via.placeholder.com/100' }
  ]);

  childData = signal({
    name: 'María Rodríguez',
    code: 'EST-2024-001',
    grade: '3ro',
    section: 'A',
    academicYear: '2024',
    tutor: 'Prof. Ana Martínez',
    tutorEmail: 'ana.martinez@colegio.edu',
    tutorPhone: '+51 987654321',
    coordinator: 'Lic. Carlos López',
    coordinatorEmail: 'carlos.lopez@colegio.edu',
    coordinatorPhone: '+51 987654322',
    enrollmentDate: '2024-03-01',
    status: 'Activo'
  });

  selectChild(childId: string) {
    this.selectedChild.set(childId);
  }
}
