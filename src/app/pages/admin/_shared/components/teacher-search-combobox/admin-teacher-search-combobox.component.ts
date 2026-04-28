import { Component, input, output, computed, signal, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherItem } from '../../../../../services/admin.service';

@Component({
  selector: 'admin-teacher-search-combobox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-teacher-search-combobox.component.html',
  styleUrl: './admin-teacher-search-combobox.component.css',
})
export class AdminTeacherSearchComboboxComponent {
  teachers = input<TeacherItem[]>([]);
  /** id del registro Teacher (`/teachers/:id`). */
  selectedId = input<string>('');

  selectedIdChange = output<string>();

  fieldLabel = input('Profesor');
  /** Si true, oculta la etiqueta interna (ej. cuando el padre ya usa `.form-label`). */
  withoutLabel = input(false);
  placeholder = input('Escribe para buscar por nombre…');
  disabled = input(false);

  readonly searchText = signal('');
  readonly dropdownOpen = signal(false);

  private blurTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const id = this.selectedId();
      const list = this.teachers();
      if (!id || !list.length) return;
      const t = list.find(x => x.id === id);
      if (t) this.searchText.set(this.labelOf(t));
    });
  }

  labelOf(t: TeacherItem): string {
    const n = (t.name ?? '').trim();
    if (n) return n;
    const u = t.user;
    return `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || '(sin nombre)';
  }

  initialsOf(t: TeacherItem): string {
    const label = this.labelOf(t);
    const parts = label.split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  filteredTeachers = computed(() => {
    const list = this.teachers();
    const q = this.searchText().toLowerCase().trim();
    if (!q) return list.slice(0, 150);
    return list.filter(t => this.labelOf(t).toLowerCase().includes(q)).slice(0, 150);
  });

  onInput(ev: Event) {
    const v = (ev.target as HTMLInputElement).value;
    this.searchText.set(v);
    if (this.selectedId()) this.selectedIdChange.emit('');
    this.dropdownOpen.set(!this.disabled());
  }

  onFocusInput() {
    if (this.disabled()) return;
    this.dropdownOpen.set(true);
  }

  scheduleClose() {
    this.blurTimer = setTimeout(() => {
      const id = this.selectedId();
      if (id) {
        const t = this.teachers().find(x => x.id === id);
        if (t) this.searchText.set(this.labelOf(t));
      }
      this.dropdownOpen.set(false);
      this.blurTimer = null;
    }, 180);
  }

  cancelClose() {
    if (this.blurTimer) {
      clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }
  }

  pick(t: TeacherItem, ev: MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.cancelClose();
    this.selectedIdChange.emit(t.id);
    this.searchText.set(this.labelOf(t));
    this.dropdownOpen.set(false);
  }

  clearSelection(ev: MouseEvent) {
    ev.preventDefault();
    this.cancelClose();
    this.selectedIdChange.emit('');
    this.searchText.set('');
    this.dropdownOpen.set(true);
  }

  trackById(_i: number, t: TeacherItem) {
    return t.id;
  }
}
