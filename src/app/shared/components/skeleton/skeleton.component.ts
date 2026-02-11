import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss'
})
export class SkeletonComponent {
  @Input() width?: string;
  @Input() height?: string;
  @Input() variant: 'text' | 'circular' | 'rectangular' = 'rectangular';
  @Input() lines?: number; // Para variant="text"
}
