import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AnnouncementService,
  Announcement,
  AnnouncementAttachment,
} from '../../../services/announcement.service';

@Component({
  selector: 'app-comunicado-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comunicado-detalle.component.html',
  styleUrl: './comunicado-detalle.component.css',
})
export class ComunicadoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly announcementService = inject(AnnouncementService);

  loading = signal(true);
  error = signal('');
  announcement = signal<Announcement | null>(null);
  markSubmitting = signal(false);
  readonly isLoading = this.loading;
  readonly comunicado = this.announcement;

  private announcementId = '';

  ngOnInit() {
    this.announcementId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  load() {
    if (!this.announcementId) {
      this.error.set('Comunicado no válido.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.announcementService.getAnnouncement(this.announcementId).subscribe({
      next: (data) => {
        this.announcement.set(data);
        this.loading.set(false);
        if (!data.isRead) {
          this.announcementService.markAsRead(this.announcementId).subscribe({
            next: () => {
              this.announcement.update((a) =>
                a ? { ...a, isRead: true, read: true, status: 'read' } : a,
              );
            },
          });
        }
      },
      error: () => {
        this.error.set('Error al cargar el comunicado');
        this.loading.set(false);
      },
    });
  }

  goBack() {
    const path = this.router.url.split('?')[0];
    if (path.includes('/padre/comunicados')) {
      void this.router.navigate(['/padre/comunicados']);
    } else {
      void this.router.navigate(['/comunicados']);
    }
  }

  markAsRead() {
    if (!this.announcementId || this.markSubmitting()) return;
    const cur = this.announcement();
    if (!cur || cur.isRead) return;
    this.markSubmitting.set(true);
    this.announcementService.markAsRead(this.announcementId).subscribe({
      next: () => {
        this.announcement.update((a) =>
          a ? { ...a, isRead: true, read: true, status: 'read' } : a,
        );
        this.markSubmitting.set(false);
      },
      error: () => {
        this.markSubmitting.set(false);
      },
    });
  }

  downloadAttachmentFile(file: AnnouncementAttachment) {
    window.open(this.announcementService.getDownloadUrl(this.announcementId, file.id));
  }

  downloadAllAttachments() {
    const a = this.announcement();
    if (!a?.attachments?.length) return;
    for (const f of a.attachments) {
      window.open(this.announcementService.getDownloadUrl(this.announcementId, f.id));
    }
  }

  attachmentKind(file: AnnouncementAttachment): 'pdf' | 'doc' | 'xls' | 'img' | 'file' {
    const m = (file.mimeType ?? '').toLowerCase();
    if (m.includes('pdf')) return 'pdf';
    if (m.includes('word') || m.includes('msword') || m.includes('document')) return 'doc';
    if (m.includes('sheet') || m.includes('excel')) return 'xls';
    if (m.includes('image')) return 'img';
    return 'file';
  }

  formatAttachmentSize(bytes?: number): string {
    if (bytes == null || !Number.isFinite(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getAuthorName(): string {
    const a = this.announcement();
    if (!a) return '';
    return (
      a.author?.name?.trim() ||
      `${a.author.firstName ?? ''} ${a.author.lastName ?? ''}`.trim()
    );
  }

  typeLabel(type: string): string {
    const t = (type || '').toUpperCase();
    if (t === 'GENERAL') return 'General';
    if (t === 'ACADEMIC') return 'Académico';
    if (t === 'EVENT') return 'Evento';
    if (t === 'URGENT') return 'Aviso urgente';
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
}
