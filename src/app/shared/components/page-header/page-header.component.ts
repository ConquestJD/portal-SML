import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface Breadcrumb {
  label: string;
  route?: string;
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss'
})
export class PageHeaderComponent {
  @Input() title: string = '';
  @Input() subtitle?: string;
  @Input() breadcrumbs?: Breadcrumb[];
  @Input() actions?: { label: string; icon?: string; route?: string; action?: () => void; variant?: 'primary' | 'secondary' | 'ghost' }[];
}
