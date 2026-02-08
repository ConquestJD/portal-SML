import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-configuracion-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion-profesor.component.html',
  styleUrl: './configuracion-profesor.component.css'
})
export class ConfiguracionProfesorComponent implements OnInit {
  isLoading = signal(true);
  isSaving = signal(false);

  // Notificaciones
  notifications = signal({
    emailNotifications: true,
    smsNotifications: false,
    newTasks: true,
    taskSubmissions: true,
    urgentAnnouncements: true,
    studentMessages: true
  });



  constructor() {}

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.isLoading.set(true);
    
    // Simular carga de configuración
    setTimeout(() => {
      // Los valores por defecto ya están establecidos en los signals
      this.isLoading.set(false);
    }, 300);
  }

  updateEmailNotifications(value: boolean) {
    this.notifications.update(n => ({ ...n, emailNotifications: value }));
  }

  updateSmsNotifications(value: boolean) {
    this.notifications.update(n => ({ ...n, smsNotifications: value }));
  }

  updateNewTasks(value: boolean) {
    this.notifications.update(n => ({ ...n, newTasks: value }));
  }

  updateTaskSubmissions(value: boolean) {
    this.notifications.update(n => ({ ...n, taskSubmissions: value }));
  }

  updateUrgentAnnouncements(value: boolean) {
    this.notifications.update(n => ({ ...n, urgentAnnouncements: value }));
  }

  updateStudentMessages(value: boolean) {
    this.notifications.update(n => ({ ...n, studentMessages: value }));
  }



  saveSettings() {
    this.isSaving.set(true);
    
    // Simular guardado
    setTimeout(() => {
      console.log('Guardando configuración:', {
        notifications: this.notifications()
      });
      this.isSaving.set(false);
      alert('Configuración guardada exitosamente');
    }, 1000);
  }
}
