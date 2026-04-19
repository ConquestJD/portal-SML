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
    <span class="badge" [ngClass]="value | statusBadge:kind">
      {{ value | statusLabel:(kind === 'payment' ? 'payment' : 'user') }}
    </span>
  `,
})
export class AdminStatusBadgeComponent {
  @Input() value: string | null | undefined = '';
  @Input() kind: StatusKind = 'user';
}
