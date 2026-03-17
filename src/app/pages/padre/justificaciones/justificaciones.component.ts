import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ParentService, Child, ParentJustification } from '../../../services/parent.service';

@Component({
  selector: 'app-justificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './justificaciones.component.html',
  styleUrl: './justificaciones.component.css'
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

  constructor(private parentService: ParentService) {}

  ngOnInit() {
    this.parentService.getChildren().subscribe({
      next: (data) => {
        this.children.set(data);
        if (data.length) { this.selectedChildId.set(data[0].id); this.load(data[0].id); }
        this.loading.set(false);
      }
    });
  }

  selectChild(id: string) { this.selectedChildId.set(id); this.load(id); }

  load(childId: string) {
    this.parentService.getJustifications(childId).subscribe({
      next: (data) => this.justifications.set(data)
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  submit() {
    const childId = this.selectedChildId();
    const { reason, date } = this.formData();
    if (!reason || !date) return;
    this.saving.set(true);
    this.parentService.submitJustification(childId, reason, date, this.selectedFile ?? undefined).subscribe({
      next: () => {
        this.success.set('Justificación enviada');
        this.showForm.set(false);
        this.formData.set({ reason: '', date: '' });
        this.selectedFile = null;
        this.saving.set(false);
        this.load(childId);
      },
      error: () => this.saving.set(false)
    });
  }

  getChildName(c: Child): string { return `${c.user.firstName} ${c.user.lastName}`; }
  update(field: string, value: string) { this.formData.update(d => ({ ...d, [field]: value })); }
}
