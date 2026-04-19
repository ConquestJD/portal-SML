import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  link?: string | unknown[];
}

@Component({
  selector: 'admin-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="admin-breadcrumb" aria-label="Breadcrumb">
      @for (item of items; track item.label; let last = $last; let first = $first) {
        @if (first && item.link) {
          <a [routerLink]="item.link" class="breadcrumb-link">
            <i class="fas fa-arrow-left"></i> Volver a {{ item.label }}
          </a>
        } @else if (item.link && !last) {
          <a [routerLink]="item.link" class="breadcrumb-link">{{ item.label }}</a>
        } @else {
          <span class="breadcrumb-current">{{ item.label }}</span>
        }
        @if (!last) {
          <span class="breadcrumb-separator">/</span>
        }
      }
    </nav>
  `,
  styles: [`
    .admin-breadcrumb {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--spacing-sm, 0.5rem);
      margin-bottom: var(--spacing-xl, 1.5rem);
      color: var(--text-secondary, #6b7280);
      font-size: var(--font-size-sm, 0.875rem);
    }
    .breadcrumb-link {
      color: var(--primary, #003366);
      text-decoration: none;
      transition: color 0.2s;
    }
    .breadcrumb-link:hover { color: var(--primary-dark, #001a33); }
    .breadcrumb-separator { color: var(--text-tertiary, #9ca3af); }
    .breadcrumb-current { color: var(--text-primary, #111827); font-weight: 500; }
  `],
})
export class AdminBreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];
}
