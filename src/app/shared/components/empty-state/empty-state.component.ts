import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss'
})
export class EmptyStateComponent {
  @Input() icon?: string;
  @Input() title: string = 'No hay elementos';
  @Input() description?: string;
  @Input() action?: {
    label: string;
    route?: string;
    action?: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
}
