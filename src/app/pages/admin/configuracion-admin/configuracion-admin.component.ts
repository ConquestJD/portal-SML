import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Component for school configuration

@Component({
  selector: 'app-configuracion-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './configuracion-admin.component.html',
  styleUrl: './configuracion-admin.component.css'
})
export class ConfiguracionAdminComponent {
  schoolData = signal({
    name: 'Colegio Santa María Laura',
    address: 'Av. Principal 123',
    phone: '+51 987654321',
    email: 'contacto@colegio.edu'
  });

  patchSchool(field: 'name' | 'address' | 'phone' | 'email', value: string) {
    this.schoolData.update((d) => ({ ...d, [field]: value }));
  }

  saveSettings() {
    console.log('Guardar configuración', this.schoolData());
  }
}
