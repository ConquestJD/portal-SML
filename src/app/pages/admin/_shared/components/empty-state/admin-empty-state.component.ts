import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'admin-empty-state',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-empty-state">
      @if (title) { <h3>{{ title }}</h3> }
      @if (message) { <p>{{ message }}</p> }
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host {
      --muted: #5c6b7e;
      --navy: #003366;
      --font-display: 'Newsreader', Georgia, serif;
      --font-ui: 'Figtree', 'Segoe UI', sans-serif;
      display: block;
      font-family: var(--font-ui);
    }
    .admin-empty-state {
      text-align: center;
      padding: 2rem 1rem;
      color: var(--muted);
    }
    .admin-empty-state h3 {
      margin: 0 0 .35rem;
      font-family: var(--font-display);
      font-size: 1.2rem;
      font-weight: 600;
      font-style: italic;
      color: var(--navy);
    }
    .admin-empty-state p {
      margin: 0;
      font-size: .9rem;
    }
  `],
})
export class AdminEmptyStateComponent {
  @Input() icon = 'fa-inbox';
  @Input() title = '';
  @Input() message = '';
}
