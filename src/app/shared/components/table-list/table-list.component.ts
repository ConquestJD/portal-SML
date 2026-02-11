import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

export interface TableRow {
  [key: string]: any;
}

@Component({
  selector: 'app-table-list',
  standalone: true,
  imports: [CommonModule, SkeletonComponent, EmptyStateComponent],
  templateUrl: './table-list.component.html',
  styleUrl: './table-list.component.scss'
})
export class TableListComponent {
  @Input() columns: TableColumn[] = [];
  @Input() rows: TableRow[] = [];
  @Input() loading?: boolean;
  @Input() emptyMessage?: string;
  @Input() clickable?: boolean;
  @Input() onRowClick?: (row: TableRow) => void;
}
