import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Component for roles and permissions management

@Component({
  selector: 'app-roles-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './roles-permisos.component.html',
  styleUrl: './roles-permisos.component.css'
})
export class RolesPermisosComponent {
  roles = signal([
    { id: '1', name: 'Administrador', permissions: ['all'] },
    { id: '2', name: 'Profesor', permissions: ['courses', 'tasks', 'grades'] },
    { id: '3', name: 'Estudiante', permissions: ['view_courses', 'submit_tasks'] }
  ]);

  savePermissions() {
    console.log('Guardar permisos');
  }
}
