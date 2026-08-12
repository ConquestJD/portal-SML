import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-configuracion-padre',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './configuracion-padre.component.html',
  styleUrl: './configuracion-padre.component.css',
})
export class ConfiguracionPadreComponent implements OnInit {
  isLoading = signal(true);
  isSaving = signal(false);
  saveMessage = signal('');

  notifications = signal({
    emailNotifications: true,
    smsNotifications: false,
    childTasks: true,
    announcements: true,
    teacherMessages: true,
    payments: true,
    attendanceAlerts: true,
  });

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.isLoading.set(true);
    setTimeout(() => this.isLoading.set(false), 300);
  }

  updateEmailNotifications(value: boolean) {
    this.notifications.update((n) => ({ ...n, emailNotifications: value }));
  }

  updateSmsNotifications(value: boolean) {
    this.notifications.update((n) => ({ ...n, smsNotifications: value }));
  }

  updateChildTasks(value: boolean) {
    this.notifications.update((n) => ({ ...n, childTasks: value }));
  }

  updateAnnouncements(value: boolean) {
    this.notifications.update((n) => ({ ...n, announcements: value }));
  }

  updateTeacherMessages(value: boolean) {
    this.notifications.update((n) => ({ ...n, teacherMessages: value }));
  }

  updatePayments(value: boolean) {
    this.notifications.update((n) => ({ ...n, payments: value }));
  }

  updateAttendanceAlerts(value: boolean) {
    this.notifications.update((n) => ({ ...n, attendanceAlerts: value }));
  }

  saveSettings() {
    this.isSaving.set(true);
    this.saveMessage.set('');
    setTimeout(() => {
      this.isSaving.set(false);
      this.saveMessage.set('Configuración guardada correctamente.');
    }, 800);
  }
}
