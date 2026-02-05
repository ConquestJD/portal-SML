import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'institucional' | 'grado' | 'seccion';
  priority: 'urgente' | 'importante' | 'normal';
  date: string;
  read: boolean;
  attachments: number;
}

@Component({
  selector: 'app-comunicados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comunicados.component.html',
  styleUrl: './comunicados.component.css'
})
export class ComunicadosComponent {
  filter = signal<'todos' | 'institucionales' | 'grado' | 'seccion' | 'urgentes'>('todos');
  searchQuery = signal('');

  announcements = signal<Announcement[]>([
    {
      id: '1',
      title: 'Reunión de Padres - Marzo 2024',
      content: 'Se convoca a todos los padres de familia a la reunión del mes de marzo...',
      type: 'institucional',
      priority: 'importante',
      date: '2024-03-10',
      read: false,
      attachments: 1
    },
    {
      id: '2',
      title: 'Actividades del Grado',
      content: 'Información sobre las actividades programadas para este mes...',
      type: 'grado',
      priority: 'normal',
      date: '2024-03-08',
      read: true,
      attachments: 0
    }
  ]);

  filteredAnnouncements = signal<Announcement[]>(this.announcements());

  unreadCount = computed(() => 
    this.announcements().filter(a => !a.read).length
  );

  urgentCount = computed(() => 
    this.announcements().filter(a => a.priority === 'urgente').length
  );

  setFilter(filter: 'todos' | 'institucionales' | 'grado' | 'seccion' | 'urgentes') {
    this.filter.set(filter);
    this.applyFilters();
  }

  onSearch() {
    this.applyFilters();
  }

  applyFilters() {
    let result = this.announcements();

    if (this.filter() !== 'todos') {
      if (this.filter() === 'urgentes') {
        result = result.filter(a => a.priority === 'urgente');
      } else {
        result = result.filter(a => a.type === this.filter());
      }
    }

    const query = this.searchQuery().toLowerCase();
    if (query) {
      result = result.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.content.toLowerCase().includes(query)
      );
    }

    this.filteredAnnouncements.set(result);
  }

  markAsRead(id: string) {
    this.announcements.update(announcements =>
      announcements.map(a => a.id === id ? { ...a, read: true } : a)
    );
    this.applyFilters();
  }
}
