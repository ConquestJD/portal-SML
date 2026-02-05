import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.css'
})
export class ConfiguracionComponent {
  activeTab = signal<'cuenta' | 'preferencias' | 'notificaciones'>('cuenta');

  // Cuenta
  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');

  // Preferencias
  language = signal('es');
  theme = signal('light');
  dateFormat = signal('DD/MM/YYYY');

  // Notificaciones
  notifications = signal({
    newTasks: true,
    grades: true,
    urgentAnnouncements: true,
    taskReminders: true,
    teacherMessages: true,
    attendanceChanges: false
  });

  setTab(tab: 'cuenta' | 'preferencias' | 'notificaciones') {
    this.activeTab.set(tab);
  }

  savePassword() {
    if (this.newPassword() !== this.confirmPassword()) {
      alert('Las contraseñas no coinciden');
      return;
    }
    // Lógica de guardado
    alert('Contraseña actualizada correctamente');
  }

  savePreferences() {
    // Lógica de guardado
    alert('Preferencias guardadas');
  }

  saveNotifications() {
    // Lógica de guardado
    alert('Configuración de notificaciones guardada');
  }

  toggleNewTasks() {
    this.notifications.update(n => ({...n, newTasks: !n.newTasks}));
  }

  toggleGrades() {
    this.notifications.update(n => ({...n, grades: !n.grades}));
  }

  toggleUrgentAnnouncements() {
    this.notifications.update(n => ({...n, urgentAnnouncements: !n.urgentAnnouncements}));
  }

  toggleTaskReminders() {
    this.notifications.update(n => ({...n, taskReminders: !n.taskReminders}));
  }
}
