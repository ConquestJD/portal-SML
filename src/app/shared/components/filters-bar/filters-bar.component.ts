import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FilterChip {
  id: string;
  label: string;
  active: boolean;
}

export interface FilterSelect {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  value?: string;
}

@Component({
  selector: 'app-filters-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filters-bar.component.html',
  styleUrl: './filters-bar.component.scss'
})
export class FiltersBarComponent {
  @Input() searchPlaceholder: string = 'Buscar...';
  @Input() searchValue: string = '';
  @Input() chips?: FilterChip[];
  @Input() selects?: FilterSelect[];
  @Output() searchChange = new EventEmitter<string>();
  @Output() chipToggle = new EventEmitter<string>();
  @Output() selectChange = new EventEmitter<{ id: string; value: string }>();

  onSearchChange(value: string) {
    this.searchChange.emit(value);
  }

  onChipToggle(chipId: string) {
    this.chipToggle.emit(chipId);
  }

  onSelectChange(selectId: string, value: string) {
    this.selectChange.emit({ id: selectId, value });
  }
}
