import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnnouncementService, Announcement } from '../../services/announcement.service';

@Component({
  selector: 'app-comunicados',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './comunicados.component.html',
  styleUrl: './comunicados.component.css'
})
export class ComunicadosComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  filterType = signal('');
  filterPriority = signal('');
  filterRead = signal('');
  searchQuery = signal('');
  filter = signal('all');
  currentPage = signal(1);
  totalPages = signal(1);

  announcements = signal<Announcement[]>([]);

  filteredAnnouncements = computed(() => {
    const f = this.filter();
    if (!f || f === 'all') return this.announcements();
    if (f === 'unread') return this.announcements().filter(a => !a.isRead);
    return this.announcements().filter(a => a.type === f.toUpperCase() || a.priority === f.toUpperCase());
  });

  urgentCount = computed(() => this.announcements().filter(a => a.priority === 'HIGH' || a.priority === 'URGENT').length);

  constructor(private announcementService: AnnouncementService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.announcementService.getAnnouncements({
      type: this.filterType() || undefined,
      priority: this.filterPriority() || undefined,
      read: this.filterRead() !== '' ? this.filterRead() === 'true' : undefined,
      search: this.searchQuery() || undefined,
      page: this.currentPage(),
      pageSize: 20
    }).subscribe({
      next: ({ data, meta }) => {
        this.announcements.set(data);
        this.totalPages.set(meta.totalPages);
        this.loading.set(false);
      },
      error: () => { this.error.set('Error al cargar comunicados'); this.loading.set(false); }
    });
  }

  markAsRead(id: string, event: Event) {
    event.stopPropagation();
    this.announcementService.markAsRead(id).subscribe({
      next: () => this.announcements.update(list =>
        list.map(a => a.id === id ? { ...a, isRead: true } : a)
      )
    });
  }

  onFilterChange() { this.currentPage.set(1); this.load(); }
  onSearch() { this.onFilterChange(); }
  setFilter(f: string) { this.filter.set(f); }
  prevPage() { if (this.currentPage() > 1) { this.currentPage.update(p => p - 1); this.load(); } }
  nextPage() { if (this.currentPage() < this.totalPages()) { this.currentPage.update(p => p + 1); this.load(); } }

  unreadCount(): number { return this.announcements().filter(a => !a.isRead).length; }
}
