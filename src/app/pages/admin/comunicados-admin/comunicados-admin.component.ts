import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnnouncementService, Announcement, CreateAnnouncementDto } from '../../../services/announcement.service';

@Component({
  selector: 'app-comunicados-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './comunicados-admin.component.html',
  styleUrl: './comunicados-admin.component.css'
})
export class ComunicadosAdminComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  showForm = signal(false);
  editId = signal('');
  saving = signal(false);

  announcements = signal<Announcement[]>([]);
  // Alias para compatibilidad con template
  get comunicados() { return this.announcements; }
  filterType = signal('');
  filterPriority = signal('');
  searchQuery = signal('');
  currentPage = signal(1);
  totalPages = signal(1);

  formData = signal<CreateAnnouncementDto>({
    title: '', content: '', type: 'GENERAL', priority: 'MEDIUM',
    targetRoles: ['STUDENT', 'TEACHER', 'PARENT']
  });

  types = ['GENERAL', 'ACADEMIC', 'EVENT', 'URGENT'];
  priorities = ['LOW', 'MEDIUM', 'HIGH'];
  allRoles = ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'];

  constructor(private announcementService: AnnouncementService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.announcementService.getAnnouncements({
      type: this.filterType() || undefined,
      priority: this.filterPriority() || undefined,
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

  save() {
    this.saving.set(true);
    const obs = this.editId()
      ? this.announcementService.update(this.editId(), this.formData())
      : this.announcementService.create(this.formData());

    obs.subscribe({
      next: () => { this.showForm.set(false); this.editId.set(''); this.saving.set(false); this.load(); },
      error: () => this.saving.set(false)
    });
  }

  edit(a: Announcement) {
    this.editId.set(a.id);
    this.formData.set({
      title: a.title, content: a.content, type: a.type,
      priority: a.priority, targetRoles: [...a.targetRoles]
    });
    this.showForm.set(true);
  }

  delete(id: string) {
    if (!confirm('¿Eliminar comunicado?')) return;
    this.announcementService.delete(id).subscribe({ next: () => this.load() });
  }

  createComunicado() { this.showForm.set(true); this.editId.set(''); this.formData.set({ title: '', content: '', type: 'GENERAL', priority: 'MEDIUM', targetRoles: ['STUDENT', 'TEACHER', 'PARENT'] }); }
  cancelForm() { this.showForm.set(false); this.editId.set(''); }

  toggleRole(role: string) {
    const current = this.formData().targetRoles;
    const updated = current.includes(role) ? current.filter(r => r !== role) : [...current, role];
    this.formData.update(d => ({ ...d, targetRoles: updated }));
  }

  hasRole(role: string): boolean { return this.formData().targetRoles.includes(role); }
  update(field: string, value: string) { this.formData.update(d => ({ ...d, [field]: value })); }
}
