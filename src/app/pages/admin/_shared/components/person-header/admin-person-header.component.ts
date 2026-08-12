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
        <div class="person-avatar" [style.background]="avatarColor || null">
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
                <span class="meta-item">{{ item }}</span>
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
                 class="ph-btn"
                 [class.ph-btn--primary]="(action.variant ?? 'primary') === 'primary'"
                 [class.ph-btn--secondary]="action.variant === 'secondary'"
                 [class.ph-btn--danger]="action.variant === 'danger'">
                {{ action.label }}
              </a>
            } @else {
              <button type="button"
                      class="ph-btn"
                      [class.ph-btn--primary]="(action.variant ?? 'primary') === 'primary'"
                      [class.ph-btn--secondary]="action.variant === 'secondary'"
                      [class.ph-btn--danger]="action.variant === 'danger'"
                      (click)="handleClick(action)">
                {{ action.label }}
              </button>
            }
          }
        </div>
      }
    </header>
  `,
  styles: [`
    :host {
      --navy: #003366;
      --navy-deep: #001528;
      --crimson: #c41e3a;
      --ink: #142033;
      --muted: #5c6b7e;
      --line: rgba(20 32 51 / .1);
      --font-display: 'Newsreader', Georgia, serif;
      --font-ui: 'Figtree', 'Segoe UI', sans-serif;
      display: block;
      font-family: var(--font-ui);
    }
    .person-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.25rem;
      padding: 1.25rem 0 1.35rem;
      border-bottom: 1px solid var(--line);
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
    }
    .person-header-main {
      display: flex;
      align-items: center;
      gap: 1rem;
      min-width: 0;
      flex: 1;
    }
    .person-avatar {
      width: 4rem;
      height: 4rem;
      background: var(--navy);
      color: #fff;
      display: grid;
      place-items: center;
      font-family: var(--font-display);
      font-size: 1.35rem;
      font-weight: 600;
      flex-shrink: 0;
    }
    .person-heading { min-width: 0; }
    .person-title-row {
      display: flex;
      align-items: center;
      gap: .65rem;
      flex-wrap: wrap;
    }
    .person-name {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(1.5rem, 2.5vw, 2rem);
      font-weight: 600;
      color: var(--navy);
      line-height: 1.15;
      word-break: break-word;
    }
    .person-subtitle {
      margin: .3rem 0 0;
      color: var(--muted);
      font-size: .85rem;
      font-weight: 600;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .person-meta {
      display: flex;
      flex-wrap: wrap;
      gap: .75rem;
      margin-top: .4rem;
      font-size: .8rem;
      color: var(--muted);
      font-family: var(--font-display);
      font-style: italic;
    }
    .person-actions {
      display: flex;
      gap: .45rem;
      flex-wrap: wrap;
    }
    .ph-btn {
      display: inline-flex;
      align-items: center;
      min-height: 2.4rem;
      padding: .5rem 1rem;
      border: none;
      font-family: inherit;
      font-size: .8rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
    }
    .ph-btn--primary { background: var(--navy); color: #fff; }
    .ph-btn--primary:hover { background: var(--navy-deep); }
    .ph-btn--secondary {
      background: transparent;
      color: var(--navy);
      border-bottom: 2px solid var(--line);
    }
    .ph-btn--danger { background: transparent; color: var(--crimson); border-bottom: 2px solid transparent; }
    .ph-btn--danger:hover { border-bottom-color: var(--crimson); }
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
