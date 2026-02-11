import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export type TrendDirection = 'up' | 'down' | 'neutral';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss'
})
export class StatCardComponent {
  @Input() label: string = '';
  @Input() value: string | number = '';
  @Input() icon?: string;
  @Input() trend?: {
    direction: TrendDirection;
    value: string;
    label?: string;
  };
  @Input() action?: {
    label: string;
    route?: string;
    action?: () => void;
  };
  @Input() progress?: number; // 0-100
  @Input() color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}
