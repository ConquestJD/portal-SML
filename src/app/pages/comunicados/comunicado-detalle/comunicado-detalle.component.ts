import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AnnouncementService, Announcement } from '../../../services/announcement.service';

@Component({
  selector: 'app-comunicado-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './comunicado-detalle.component.html',
  styleUrl: './comunicado-detalle.component.css'
})
export class ComunicadoDetalleComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  announcement = signal<Announcement | null>(null);
  readonly isLoading = this.loading;

  readonly comunicado = this.announcement;

  constructor(private route: ActivatedRoute, private announcementService: AnnouncementService) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.announcementService.getAnnouncement(id).subscribe({
      next: (data) => {
        this.announcement.set(data);
        this.loading.set(false);
        if (!data.isRead) {
          this.announcementService.markAsRead(id).subscribe();
        }
      },
      error: () => { this.error.set('Error al cargar el comunicado'); this.loading.set(false); }
    });
  }

  downloadAttachment(announcementId: string, fileId: string) {
    window.open(this.announcementService.getDownloadUrl(announcementId, fileId));
  }

  getAuthorName(): string {
    const a = this.announcement();
    if (!a) return '';
    return `${a.author.firstName} ${a.author.lastName}`;
  }
}
