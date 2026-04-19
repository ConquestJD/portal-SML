import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'admin-info-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-info-card">
      @if (title) {
        <div class="card-header">
          @if (icon) { <i class="fas" [ngClass]="icon"></i> }
          <h3>{{ title }}</h3>
        </div>
      }
      <div class="card-body">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .admin-info-card {
      background: var(--bg-primary, #fff);
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: var(--border-radius, 0.5rem);
      padding: var(--spacing-lg, 1.5rem);
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm, 0.5rem);
      margin-bottom: var(--spacing-md, 1rem);
      padding-bottom: var(--spacing-sm, 0.5rem);
      border-bottom: 1px solid var(--border-color, #e5e7eb);
    }
    .card-header h3 {
      margin: 0;
      font-size: var(--font-size-lg, 1.125rem);
      color: var(--primary, #003366);
      font-weight: 600;
    }
    .card-header i { color: var(--primary, #003366); }
    .card-body { display: flex; flex-direction: column; gap: var(--spacing-sm, 0.5rem); }
  `],
})
export class AdminInfoCardComponent {
  @Input() title = '';
  @Input() icon = '';
}

@Component({
  selector: 'admin-info-item',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-info-item">
      <span class="label">{{ label }}</span>
      <span class="value">
        <ng-content></ng-content>
      </span>
    </div>
  `,
  styles: [`
    .admin-info-item {
      display: flex;
      justify-content: space-between;
      gap: var(--spacing-md, 1rem);
      padding: var(--spacing-xs, 0.25rem) 0;
      align-items: center;
      flex-wrap: wrap;
    }
    .label {
      color: var(--text-secondary, #6b7280);
      font-size: var(--font-size-sm, 0.875rem);
    }
    .value {
      color: var(--text-primary, #111827);
      font-weight: 500;
      text-align: right;
      word-break: break-word;
    }
  `],
})
export class AdminInfoItemComponent {
  @Input() label = '';
}
