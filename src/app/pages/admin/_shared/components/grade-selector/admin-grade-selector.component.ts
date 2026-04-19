import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface GradeOption {
  value: string;
  count?: number;
}

@Component({
  selector: 'admin-grade-selector',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grade-selector">
      <h2 class="grade-selector-title">{{ title }}</h2>
      @if (grades.length === 0) {
        <div class="grade-empty">
          <i class="fas fa-inbox"></i>
          <p>{{ emptyMessage }}</p>
        </div>
      } @else {
        <div class="grades-grid">
          @for (grade of grades; track grade.value) {
            <button type="button" class="grade-card" (click)="pick(grade.value)">
              <div class="grade-icon">
                <i class="fas fa-graduation-cap"></i>
              </div>
              <div class="grade-info">
                <h3>{{ grade.value }}</h3>
                @if (grade.count !== undefined) {
                  <p>{{ grade.count }} {{ itemLabel }}</p>
                }
              </div>
              <i class="fas fa-chevron-right grade-arrow"></i>
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .grade-selector-title {
      font-size: var(--font-size-xl, 1.25rem);
      font-weight: 700;
      color: var(--primary, #003366);
      margin: 0 0 var(--spacing-lg, 1.5rem) 0;
    }
    .grades-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: var(--spacing-lg, 1.5rem);
    }
    .grade-card {
      display: flex;
      align-items: center;
      gap: var(--spacing-md, 1rem);
      padding: var(--spacing-lg, 1.5rem);
      background: var(--bg-primary, #fff);
      border: 2px solid var(--border-color, #e5e7eb);
      border-radius: var(--border-radius-lg, 0.75rem);
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
      width: 100%;
    }
    .grade-card:hover {
      border-color: var(--primary, #003366);
      transform: translateY(-2px);
      box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1));
    }
    .grade-icon {
      width: 60px; height: 60px;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, var(--primary, #003366), var(--primary-dark, #001a33));
      border-radius: var(--border-radius, 0.5rem);
      color: white;
      font-size: var(--font-size-xl, 1.25rem);
    }
    .grade-info { flex: 1; }
    .grade-info h3 { margin: 0 0 var(--spacing-xs, 0.25rem) 0; font-size: var(--font-size-lg, 1.125rem); color: var(--text-primary, #111827); }
    .grade-info p { margin: 0; font-size: var(--font-size-sm, 0.875rem); color: var(--text-secondary, #6b7280); }
    .grade-arrow { color: var(--text-tertiary, #9ca3af); font-size: var(--font-size-lg, 1.125rem); }
    .grade-empty {
      text-align: center; padding: var(--spacing-2xl, 2rem);
      color: var(--text-secondary, #6b7280);
    }
    .grade-empty i { font-size: var(--font-size-3xl, 2rem); margin-bottom: var(--spacing-md, 1rem); color: var(--text-tertiary, #9ca3af); }
  `],
})
export class AdminGradeSelectorComponent {
  @Input() title = 'Selecciona un Grado';
  @Input() grades: GradeOption[] = [];
  @Input() emptyMessage = 'No hay grados disponibles';
  @Input() itemLabel = 'elementos';
  @Output() selected = new EventEmitter<string>();

  pick(value: string) { this.selected.emit(value); }
}
