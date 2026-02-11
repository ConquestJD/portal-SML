import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent } from '../badge/badge.component';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
  badge?: string | number;
  disabled?: boolean;
}

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss'
})
export class TabsComponent {
  @Input() tabs: Tab[] = [];
  @Input() activeTab: string = '';
  @Output() tabChange = new EventEmitter<string>();

  selectTab(tabId: string) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab && !tab.disabled) {
      this.activeTab = tabId;
      this.tabChange.emit(tabId);
    }
  }
}
