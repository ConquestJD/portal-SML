import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AnnouncementService, Announcement } from '../../services/announcement.service';

@Component({
  selector: 'app-comunicados',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './comunicados.component.html',
  styleUrl: './comunicados.component.css',
})
export class ComunicadosComponent implements OnInit {
  private readonly announcementService = inject(AnnouncementService);
  private readonly router = inject(Router);

  loading = signal(true);
  error = signal('');
  announcements = signal<Announcement[]>([]);

  unreadCount = computed(() => this.announcements().filter((a) => !a.isRead).length);

  urgentCount = computed(() =>
    this.announcements().filter((a) => (a.priority || '').toUpperCase() === 'HIGH').length,
  );

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.announcementService
      .getAnnouncements({
        page: 1,
        pageSize: 50,
      })
      .subscribe({
        next: ({ data }) => {
          this.announcements.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los comunicados.');
          this.loading.set(false);
        },
      });
  }

  markAsRead(id: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.announcementService.markAsRead(id).subscribe({
      next: () =>
        this.announcements.update((list) =>
          list.map((a) => (a.id === id ? { ...a, isRead: true, read: true } : a)),
        ),
    });
  }

  /** Ruta de detalle según portal (alumno vs padre). */
  detailCommands(id: string): string[] {
    const path = this.router.url.split('?')[0];
    if (path.startsWith('/padre/comunicados')) return ['/padre/comunicados', id];
    return ['/comunicados', id];
  }

  formatDate(a: Announcement): string {
    const raw = a.date ?? a.publishedAt;
    if (!raw) return '—';
    const d = new Date(raw);
    return Number.isNaN(d.getTime())
      ? raw
      : d.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
  }

  typeLabel(type: string): string {
    const t = (type || '').toUpperCase();
    if (t === 'GENERAL') return 'General';
    if (t === 'ACADEMIC') return 'Académico';
    if (t === 'EVENT') return 'Evento';
    if (t === 'URGENT') return 'Aviso';
    return type || 'Comunicado';
  }

  priorityLabel(priority: string): string {
    const p = (priority || '').toUpperCase();
    if (p === 'HIGH') return 'Urgente';
    if (p === 'LOW') return 'Baja';
    if (p === 'MEDIUM') return 'Normal';
    return priority || '—';
  }

  isUrgent(a: Announcement): boolean {
    return (a.priority || '').toUpperCase() === 'HIGH';
  }

  excerpt(text: string, max = 220): string {
    const t = (text ?? '').trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max).trim()}…`;
  }
}
