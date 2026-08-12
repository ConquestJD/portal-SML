import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AdminTab {
  id: string;
  label: string;
  icon?: string;
  badge?: string | number;
}

@Component({
  selector: 'admin-tabs',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-tabs" role="tablist">
      @for (tab of tabs; track tab.id) {
        <button type="button"
                class="admin-tab-btn"
                [class.active]="activeTab === tab.id"
                role="tab"
                [attr.aria-selected]="activeTab === tab.id"
                (click)="select(tab.id)">
          <span>{{ tab.label }}</span>
          @if (tab.badge !== undefined && tab.badge !== null && tab.badge !== '') {
            <span class="tab-badge">{{ tab.badge }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: [`
    :host {
      --navy: #003366;
      --muted: #5c6b7e;
      --line: rgba(20 32 51 / .1);
      --font-ui: 'Figtree', 'Segoe UI', sans-serif;
      display: block;
      font-family: var(--font-ui);
    }
    .admin-tabs {
      display: flex;
      gap: .2rem;
      border-bottom: 1px solid var(--line);
      margin-bottom: 1.15rem;
      overflow-x: auto;
    }
    .admin-tab-btn {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      padding: .75rem 1rem;
      color: var(--muted);
      cursor: pointer;
      font: inherit;
      font-size: .82rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: .4rem;
      white-space: nowrap;
      margin-bottom: -1px;
    }
    .admin-tab-btn:hover { color: var(--navy); }
    .admin-tab-btn.active {
      color: var(--navy);
      border-bottom-color: var(--navy);
    }
    .tab-badge {
      font-size: .68rem;
      font-weight: 700;
      letter-spacing: .04em;
      color: var(--muted);
    }
    .admin-tab-btn.active .tab-badge { color: var(--navy); }
  `],
})
export class AdminTabsComponent {
  @Input() tabs: AdminTab[] = [];
  @Input() activeTab = '';
  @Output() activeTabChange = new EventEmitter<string>();

  select(id: string) { this.activeTabChange.emit(id); }
}
