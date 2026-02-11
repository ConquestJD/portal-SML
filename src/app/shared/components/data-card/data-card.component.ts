import { Component, Input, ContentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-data-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-card.component.html',
  styleUrl: './data-card.component.scss'
})
export class DataCardComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() icon?: string;
  @Input() actions?: { label: string; icon?: string; action: () => void; variant?: 'primary' | 'secondary' | 'ghost' }[];
  @Input() loading?: boolean;
  @Input() empty?: boolean;
  @Input() emptyMessage?: string;
}
