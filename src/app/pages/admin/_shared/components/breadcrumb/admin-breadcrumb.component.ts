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
          <a [routerLink]="item.link" class="breadcrumb-link">← {{ item.label }}</a>
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
    :host {
      --navy: #003366;
      --muted: #5c6b7e;
      --font-ui: 'Figtree', 'Segoe UI', sans-serif;
      display: block;
      font-family: var(--font-ui);
    }
    .admin-breadcrumb {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: .5rem;
      margin-bottom: 1rem;
      color: var(--muted);
      font-size: .82rem;
      font-weight: 600;
    }
    .breadcrumb-link {
      color: var(--navy);
      text-decoration: none;
    }
    .breadcrumb-link:hover { text-decoration: underline; }
    .breadcrumb-separator { color: var(--muted); opacity: .6; }
    .breadcrumb-current { color: var(--muted); font-weight: 500; }
  `],
})
export class AdminBreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];
}
