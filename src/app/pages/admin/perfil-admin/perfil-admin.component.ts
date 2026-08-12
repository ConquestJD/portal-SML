import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Component for admin profile

@Component({
  selector: 'app-perfil-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './perfil-admin.component.html',
  styleUrl: './perfil-admin.component.css'
})
export class PerfilAdminComponent {
  adminData = signal({
    name: 'Administrador',
    email: 'admin@colegio.edu',
    phone: '+51 987654321'
  });

  patchAdmin(field: 'name' | 'email' | 'phone', value: string) {
    this.adminData.update((d) => ({ ...d, [field]: value }));
  }

  saveProfile() {
    console.log('Guardar perfil', this.adminData());
  }
}
