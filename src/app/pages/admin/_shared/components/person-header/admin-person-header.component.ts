import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminStatusBadgeComponent } from '../status-badge/admin-status-badge.component';

export interface PersonHeaderAction {
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  link?: string | unknown[];
  onClick?: () => void;
}

@Component({
  selector: 'admin-person-header',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminStatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="person-header">
      <div class="person-header-main">
        <div class="person-avatar" [style.background]="avatarColor">
          @if (avatarIcon) {
            <i class="fas" [ngClass]="avatarIcon"></i>
          } @else {
            <span>{{ initials }}</span>
          }
        </div>
        <div class="person-heading">
          <div class="person-title-row">
            <h1 class="person-name">{{ name || '—' }}</h1>
            @if (status) {
              <admin-status-badge [value]="status"></admin-status-badge>
            }
          </div>
          @if (subtitle) {
            <p class="person-subtitle">{{ subtitle }}</p>
          }
          @if (meta?.length) {
            <div class="person-meta">
              @for (item of meta; track item) {
                <span class="meta-item"><i class="fas fa-circle"></i> {{ item }}</span>
              }
            </div>
          }
        </div>
      </div>
      @if (actions?.length) {
        <div class="person-actions">
          @for (action of actions; track action.label) {
            @if (action.link) {
              <a [routerLink]="action.link"
                 class="btn"
                 [class.btn-primary]="(action.variant ?? 'primary') === 'primary'"
                 [class.btn-secondary]="action.variant === 'secondary'"
                 [class.btn-danger]="action.variant === 'danger'">
                @if (action.icon) { <i class="fas" [ngClass]="action.icon"></i> }
                {{ action.label }}
              </a>
            } @else {
              <button type="button"
                      class="btn"
                      [class.btn-primary]="(action.variant ?? 'primary') === 'primary'"
                      [class.btn-secondary]="action.variant === 'secondary'"
                      [class.btn-danger]="action.variant === 'danger'"
                      (click)="handleClick(action)">
                @if (action.icon) { <i class="fas" [ngClass]="action.icon"></i> }
                {{ action.label }}
              </button>
            }
          }
        </div>
      }
    </header>
  `,
  styles: [`
    .person-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--spacing-lg, 1.5rem);
      padding: var(--spacing-lg, 1.5rem) 0;
      border-bottom: 2px solid var(--border-color, #e5e7eb);
      margin-bottom: var(--spacing-xl, 2rem);
      flex-wrap: wrap;
    }
    .person-header-main {
      display: flex;
      align-items: center;
      gap: var(--spacing-md, 1rem);
      min-width: 0;
      flex: 1;
    }
    .person-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary, #003366), var(--primary-dark, #001a33));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
      font-weight: 700;
      flex-shrink: 0;
    }
    .person-heading { min-width: 0; }
    .person-title-row {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm, 0.5rem);
      flex-wrap: wrap;
    }
    .person-name {
      margin: 0;
      font-size: var(--font-size-2xl, 1.5rem);
      font-weight: 700;
      color: var(--primary, #003366);
      word-break: break-word;
    }
    .person-subtitle {
      margin: var(--spacing-xs, 0.25rem) 0 0 0;
      color: var(--text-secondary, #6b7280);
      font-size: var(--font-size-base, 1rem);
    }
    .person-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-md, 1rem);
      margin-top: var(--spacing-xs, 0.25rem);
      font-size: var(--font-size-sm, 0.875rem);
      color: var(--text-secondary, #6b7280);
    }
    .person-meta i {
      font-size: 6px;
      vertical-align: middle;
      margin-right: 4px;
      color: var(--text-tertiary, #9ca3af);
    }
    .person-actions {
      display: flex;
      gap: var(--spacing-sm, 0.5rem);
      flex-wrap: wrap;
    }
  `],
})
export class AdminPersonHeaderComponent {
  @Input() name = '';
  @Input() subtitle = '';
  @Input() status: string | null | undefined = '';
  @Input() meta: string[] = [];
  @Input() avatarIcon: string | null = null;
  @Input() avatarColor = '';
  @Input() actions: PersonHeaderAction[] = [];

  @Output() action = new EventEmitter<string>();

  get initials(): string {
    if (!this.name) return '?';
    return this.name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  handleClick(action: PersonHeaderAction) {
    if (action.onClick) action.onClick();
    this.action.emit(action.label);
  }
}
