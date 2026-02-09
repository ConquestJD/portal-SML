import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface Parent {
  id: string;
  name: string;
  email: string;
  phone: string;
  dni: string;
  address: string;
  status: 'activo' | 'inactivo';
  children: number;
  relationship: string[];
}

@Component({
  selector: 'app-padres-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './padres-admin.component.html',
  styleUrl: './padres-admin.component.css'
})
export class PadresAdminComponent {
  searchQuery = signal('');
  filterStatus = signal<'todos' | 'activo' | 'inactivo'>('todos');

  padres = signal<Parent[]>([
    {
      id: '1',
      name: 'María González',
      email: 'maria.gonzalez@email.com',
      phone: '+51 987654321',
      dni: '12345678',
      address: 'Av. Principal 123, Lima',
      status: 'activo',
      children: 2,
      relationship: ['Madre', 'Madre']
    },
    {
      id: '2',
      name: 'Carlos Rodríguez',
      email: 'carlos.rodriguez@email.com',
      phone: '+51 987654322',
      dni: '23456789',
      address: 'Jr. Los Olivos 456, San Isidro',
      status: 'activo',
      children: 1,
      relationship: ['Padre']
    },
    {
      id: '3',
      name: 'Ana Martínez',
      email: 'ana.martinez@email.com',
      phone: '+51 987654323',
      dni: '34567890',
      address: 'Av. Libertad 789, Miraflores',
      status: 'activo',
      children: 3,
      relationship: ['Madre', 'Madre', 'Madre']
    },
    {
      id: '4',
      name: 'Luis Fernández',
      email: 'luis.fernandez@email.com',
      phone: '+51 987654324',
      dni: '45678901',
      address: 'Calle Real 321, Surco',
      status: 'activo',
      children: 1,
      relationship: ['Padre']
    },
    {
      id: '5',
      name: 'Patricia López',
      email: 'patricia.lopez@email.com',
      phone: '+51 987654325',
      dni: '56789012',
      address: 'Av. Brasil 654, La Molina',
      status: 'inactivo',
      children: 2,
      relationship: ['Madre', 'Madre']
    }
  ]);

  filteredPadres = signal(this.padres());

  onSearch() {
    const query = this.searchQuery().toLowerCase();
    const status = this.filterStatus();
    let result = this.padres();

    if (query) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.email.toLowerCase().includes(query) ||
        p.dni.includes(query) ||
        p.phone.includes(query)
      );
    }
    if (status !== 'todos') {
      result = result.filter(p => p.status === status);
    }
    this.filteredPadres.set(result);
  }

  getRelationshipLabel(relationships: string[]): string {
    if (relationships.length === 0) return 'Sin relación';
    if (relationships.length === 1) return relationships[0];
    const unique = [...new Set(relationships)];
    if (unique.length === 1) return unique[0];
    return `${unique.join(' / ')}`;
  }
}
