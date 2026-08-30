import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ProfilePhotoPickerComponent } from '../../../shared/components/profile-photo-picker/profile-photo-picker.component';

@Component({
  selector: 'app-perfil-padre',
  standalone: true,
  imports: [CommonModule, RouterLink, ProfilePhotoPickerComponent],
  templateUrl: './perfil-padre.component.html',
  styleUrl: './perfil-padre.component.css',
})
export class PerfilPadreComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  photoError = signal('');
  photoSuccess = signal('');

  user = computed(() => this.authService.user());

  fullName = computed(() => {
    const u = this.user();
    return (u?.name ?? `${u?.firstName ?? ''} ${u?.lastName ?? ''}`).trim() || 'Padre de familia';
  });

  initials = computed(() => {
    const parts = this.fullName().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'P';
    return parts.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  });

  photoUrl = computed(() => this.user()?.photo ?? '');

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.getMe().subscribe({
      next: () => this.loading.set(false),
      error: () => {
        if (this.authService.user()) {
          this.loading.set(false);
          return;
        }
        this.error.set('No se pudo cargar el perfil.');
        this.loading.set(false);
      },
    });
  }

  onPhotoFailed(message: string) {
    this.photoSuccess.set('');
    this.photoError.set(message);
  }

  onPhotoSucceeded(message: string) {
    this.photoError.set('');
    this.photoSuccess.set(message);
    setTimeout(() => this.photoSuccess.set(''), 3000);
  }
}
