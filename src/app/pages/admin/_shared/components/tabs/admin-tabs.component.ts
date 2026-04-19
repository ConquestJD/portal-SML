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
          @if (tab.icon) { <i class="fas" [ngClass]="tab.icon"></i> }
          <span>{{ tab.label }}</span>
          @if (tab.badge !== undefined && tab.badge !== null && tab.badge !== '') {
            <span class="tab-badge">{{ tab.badge }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: [`
    .admin-tabs {
      display: flex;
      gap: var(--spacing-xs, 0.25rem);
      border-bottom: 2px solid var(--border-color, #e5e7eb);
      margin-bottom: var(--spacing-lg, 1.5rem);
      overflow-x: auto;
    }
    .admin-tab-btn {
      background: transparent;
      border: none;
      border-bottom: 3px solid transparent;
      padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
      color: var(--text-secondary, #6b7280);
      cursor: pointer;
      font-size: var(--font-size-sm, 0.875rem);
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: var(--spacing-xs, 0.25rem);
      white-space: nowrap;
      transition: all 0.2s;
      margin-bottom: -2px;
    }
    .admin-tab-btn:hover { color: var(--primary, #003366); }
    .admin-tab-btn.active {
      color: var(--primary, #003366);
      border-bottom-color: var(--primary, #003366);
      font-weight: 600;
    }
    .tab-badge {
      background: var(--bg-secondary, #f3f4f6);
      color: var(--text-secondary, #6b7280);
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
    }
    .admin-tab-btn.active .tab-badge {
      background: var(--primary, #003366);
      color: white;
    }
  `],
})
export class AdminTabsComponent {
  @Input() tabs: AdminTab[] = [];
  @Input() activeTab = '';
  @Output() activeTabChange = new EventEmitter<string>();

  select(id: string) { this.activeTabChange.emit(id); }
}
