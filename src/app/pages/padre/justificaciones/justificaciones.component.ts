import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ParentService, Child, ParentJustification } from '../../../services/parent.service';

@Component({
  selector: 'app-justificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './justificaciones.component.html',
  styleUrl: './justificaciones.component.css',
})
export class JustificacionesComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  showForm = signal(false);
  saving = signal(false);
  success = signal('');
  selectedChildId = signal('');
  children = signal<Child[]>([]);
  justifications = signal<ParentJustification[]>([]);

  formData = signal({ reason: '', date: '' });
  selectedFile: File | null = null;

  readonly isLoading = this.loading;

  selectedChild = computed(() => this.children().find((c) => c.id === this.selectedChildId()) ?? null);

  constructor(private parentService: ParentService) {}

  ngOnInit() {
    this.parentService.getChildren().subscribe({
      next: (data) => {
        this.children.set(data);
        if (data.length) {
          this.selectedChildId.set(data[0].id);
          this.load(data[0].id);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar hijos');
        this.loading.set(false);
      },
    });
  }

  selectChild(id: string) {
    this.selectedChildId.set(id);
    this.load(id);
  }

  load(childId: string) {
    this.loading.set(true);
    this.parentService.getJustifications(childId).subscribe({
      next: (data) => {
        this.justifications.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar justificaciones');
        this.loading.set(false);
      },
    });
  }

  openForm() {
    this.showForm.set(true);
    this.success.set('');
  }

  closeForm() {
    this.showForm.set(false);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  updateDate(event: Event) {
    const el = event.target as HTMLInputElement;
    this.formData.update((d) => ({ ...d, date: el.value }));
  }

  updateReason(event: Event) {
    const el = event.target as HTMLTextAreaElement;
    this.formData.update((d) => ({ ...d, reason: el.value }));
  }

  submit() {
    const childId = this.selectedChildId();
    const { reason, date } = this.formData();
    if (!reason || !date) return;
    this.saving.set(true);
    this.error.set('');
    this.parentService.submitJustification(childId, reason, date, this.selectedFile ?? undefined).subscribe({
      next: () => {
        this.success.set('Justificación enviada correctamente');
        this.showForm.set(false);
        this.formData.set({ reason: '', date: '' });
        this.selectedFile = null;
        this.saving.set(false);
        this.load(childId);
      },
      error: () => {
        this.error.set('No se pudo enviar la justificación');
        this.saving.set(false);
      },
    });
  }

  getChildName(c: Child): string {
    return `${c.user.firstName} ${c.user.lastName}`;
  }

  getChildGrade(c: Child): string {
    return c.grade ?? c.enrollments?.[0]?.section?.grade ?? '';
  }

  getChildInitial(c: Child): string {
    const fn = c.user?.firstName?.charAt(0) ?? '';
    const ln = c.user?.lastName?.charAt(0) ?? '';
    return (fn + ln).toUpperCase() || '?';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      aprobada: 'Aprobada',
      pendiente: 'Pendiente',
      rechazada: 'Rechazada',
      APPROVED: 'Aprobada',
      PENDING: 'Pendiente',
      REJECTED: 'Rechazada',
    };
    return map[status] ?? status;
  }

  statusClass(status: string): string {
    const s = status.toLowerCase();
    if (s.includes('aprob') || s === 'approved') return 'status-badge--ok';
    if (s.includes('rechaz') || s === 'rejected') return 'status-badge--danger';
    return 'status-badge--warn';
  }
}
