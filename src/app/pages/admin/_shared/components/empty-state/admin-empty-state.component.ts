import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'admin-empty-state',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-empty-state">
      <i class="fas" [ngClass]="icon"></i>
      @if (title) { <h3>{{ title }}</h3> }
      @if (message) { <p>{{ message }}</p> }
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .admin-empty-state {
      text-align: center;
      padding: var(--spacing-2xl, 2rem);
      color: var(--text-secondary, #6b7280);
    }
    .admin-empty-state i {
      font-size: var(--font-size-3xl, 2rem);
      color: var(--text-tertiary, #9ca3af);
      margin-bottom: var(--spacing-md, 1rem);
    }
    .admin-empty-state h3 {
      margin: 0 0 var(--spacing-xs, 0.25rem) 0;
      font-size: var(--font-size-lg, 1.125rem);
      color: var(--text-primary, #111827);
    }
    .admin-empty-state p {
      margin: 0;
      font-size: var(--font-size-sm, 0.875rem);
    }
  `],
})
export class AdminEmptyStateComponent {
  @Input() icon = 'fa-inbox';
  @Input() title = '';
  @Input() message = '';
}
