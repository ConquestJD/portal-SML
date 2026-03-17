import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnnouncementService, Announcement } from '../../../services/announcement.service';

@Component({
  selector: 'app-comunicados-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './comunicados-profesor.component.html',
  styleUrl: './comunicados-profesor.component.css'
})
export class ComunicadosProfesorComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  searchQuery = signal('');
  filterType = signal('');
  filter = signal('all');
  announcements = signal<Announcement[]>([]);

  get comunicados() { return this.announcements; }

  constructor(private announcementService: AnnouncementService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.announcementService.getAnnouncements({
      search: this.searchQuery() || undefined,
      type: this.filterType() || undefined,
      page: 1,
      pageSize: 20
    }).subscribe({
      next: ({ data }) => { this.announcements.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar comunicados'); this.loading.set(false); }
    });
  }

  markAsRead(id: string) {
    this.announcementService.markAsRead(id).subscribe({
      next: () => this.announcements.update(list =>
        list.map(a => a.id === id ? { ...a, isRead: true } : a)
      )
    });
  }
}
