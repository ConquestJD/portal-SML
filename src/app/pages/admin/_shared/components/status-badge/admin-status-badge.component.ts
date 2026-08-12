import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusBadgePipe, StatusLabelPipe } from '../../pipes/admin-pipes';

type StatusKind = 'user' | 'payment';

@Component({
  selector: 'admin-status-badge',
  standalone: true,
  imports: [CommonModule, StatusBadgePipe, StatusLabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="sml-badge" [ngClass]="value | statusBadge:kind">
      {{ value | statusLabel:(kind === 'payment' ? 'payment' : 'user') }}
    </span>
  `,
  styles: [`
    :host {
      --navy: #003366;
      --crimson: #c41e3a;
      --font-ui: 'Figtree', 'Segoe UI', sans-serif;
      display: inline-block;
      font-family: var(--font-ui);
    }
    .sml-badge {
      display: inline-block;
      font-size: .68rem;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: var(--navy);
      border-bottom: 2px solid currentColor;
      padding: 0 0 .1rem;
      background: transparent !important;
      border-radius: 0 !important;
    }
    :host ::ng-deep .badge-success,
    .sml-badge.badge-success { color: #1a6b4a; }
    :host ::ng-deep .badge-error,
    .sml-badge.badge-error,
    :host ::ng-deep .badge-danger,
    .sml-badge.badge-danger { color: var(--crimson); }
    :host ::ng-deep .badge-warning,
    .sml-badge.badge-warning { color: #9a6b12; }
    :host ::ng-deep .badge-info,
    .sml-badge.badge-info { color: #1a5a8a; }
  `],
})
export class AdminStatusBadgeComponent {
  @Input() value: string | null | undefined = '';
  @Input() kind: StatusKind = 'user';
}
