import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { AnnouncementService, CreateAnnouncementDto } from '../../../services/announcement.service';

@Component({
  selector: 'app-crear-comunicado',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './crear-comunicado.component.html',
  styleUrl: './crear-comunicado.component.css'
})
export class CrearComunicadoComponent implements OnInit {
  isEditMode = signal(false);
  comunicadoId = signal('');
  isLoading = signal(false);
  error = signal('');
  success = signal('');

  formData = signal<CreateAnnouncementDto>({
    title: '', content: '', type: 'GENERAL', priority: 'MEDIUM',
    targetRoles: ['STUDENT', 'PARENT']
  });

  types = ['GENERAL', 'ACADEMIC', 'EVENT', 'URGENT'];
  priorities = ['LOW', 'MEDIUM', 'HIGH'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private announcementService: AnnouncementService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('comunicadoId') ?? '';
    if (id && id !== 'nuevo') {
      this.isEditMode.set(true);
      this.comunicadoId.set(id);
      this.announcementService.getAnnouncement(id).subscribe({
        next: (a) => {
          this.formData.set({
            title: a.title, content: a.content, type: a.type,
            priority: a.priority, targetRoles: [...a.targetRoles]
          });
        }
      });
    }
  }

  onSubmit() {
    this.isLoading.set(true);
    this.error.set('');
    const obs = this.isEditMode()
      ? this.announcementService.update(this.comunicadoId(), this.formData())
      : this.announcementService.create(this.formData());

    obs.subscribe({
      next: () => {
        this.success.set(this.isEditMode() ? 'Comunicado actualizado' : 'Comunicado creado');
        this.isLoading.set(false);
        this.router.navigate(['/comunicados']);
      },
      error: (err) => { this.error.set(err?.error?.error?.message ?? 'Error'); this.isLoading.set(false); }
    });
  }

  update(field: string, value: string) { this.formData.update(d => ({ ...d, [field]: value })); }
}
