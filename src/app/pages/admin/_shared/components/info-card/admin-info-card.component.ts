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
          <h3>{{ title }}</h3>
        </div>
      }
      <div class="card-body">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --navy: #003366;
      --surface: #ffffff;
      --line: rgba(20 32 51 / .1);
      --font-display: 'Newsreader', Georgia, serif;
      --font-ui: 'Figtree', 'Segoe UI', sans-serif;
      display: block;
      font-family: var(--font-ui);
    }
    .admin-info-card {
      background: var(--surface);
      padding: 1.1rem 1.2rem 1.15rem;
    }
    .card-header {
      margin-bottom: .75rem;
      padding-bottom: .55rem;
      border-bottom: 1px solid var(--line);
    }
    .card-header h3 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.15rem;
      color: var(--navy);
      font-weight: 600;
    }
    .card-body { display: flex; flex-direction: column; gap: .15rem; }
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
    :host {
      --ink: #142033;
      --muted: #5c6b7e;
      --line: rgba(20 32 51 / .1);
      --font-ui: 'Figtree', 'Segoe UI', sans-serif;
      display: block;
      font-family: var(--font-ui);
    }
    .admin-info-item {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: .65rem 0;
      border-bottom: 1px solid var(--line);
      align-items: baseline;
      flex-wrap: wrap;
    }
    :host(:last-child) .admin-info-item { border-bottom: none; }
    .label {
      color: var(--muted);
      font-size: .7rem;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .value {
      color: var(--ink);
      font-weight: 500;
      text-align: right;
      word-break: break-word;
      font-size: .95rem;
    }
  `],
})
export class AdminInfoItemComponent {
  @Input() label = '';
}
