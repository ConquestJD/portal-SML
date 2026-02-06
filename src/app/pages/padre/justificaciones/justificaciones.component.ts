import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-justificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './justificaciones.component.html',
  styleUrl: './justificaciones.component.css'
})
export class JustificacionesComponent {
  selectedChild = signal('1');
  showForm = signal(false);
  
  children = signal([
    { id: '1', name: 'María Rodríguez', grade: '3ro', section: 'A' }
  ]);

  formData = signal({
    date: '',
    type: 'falta',
    reason: '',
    document: null as File | null
  });

  justifications = signal([
    { id: '1', date: '2024-03-09', type: 'falta', reason: 'Enfermedad', status: 'aprobada', submittedDate: '2024-03-09' },
    { id: '2', date: '2024-03-08', type: 'tardanza', reason: 'Tráfico', status: 'pendiente', submittedDate: '2024-03-08' }
  ]);

  submitJustification() {
    console.log('Enviar justificación', this.formData());
    this.showForm.set(false);
    // Reset form
    this.formData.set({
      date: '',
      type: 'falta',
      reason: '',
      document: null
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.formData.update(data => ({ ...data, document: input.files![0] }));
    }
  }

  updateDate(event: Event) {
    const input = event.target as HTMLInputElement;
    this.formData.update(data => ({ ...data, date: input.value }));
  }

  updateType(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.formData.update(data => ({ ...data, type: select.value }));
  }

  updateReason(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.formData.update(data => ({ ...data, reason: textarea.value }));
  }
}
