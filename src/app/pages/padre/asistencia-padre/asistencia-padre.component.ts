import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ParentService, Child } from '../../../services/parent.service';

export interface AttendanceRowVm {
  date: string;
  statusRaw: string;
  /** clase CSS: presente | ausente | tardanza */
  statusClass: 'presente' | 'ausente' | 'tardanza' | 'otro';
  statusLabel: string;
  time: string;
  observation: string;
}

@Component({
  selector: 'app-asistencia-padre',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './asistencia-padre.component.html',
  styleUrl: './asistencia-padre.component.css',
})
export class AsistenciaPadreComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedChildId = signal('');
  children = signal<Child[]>([]);
  attendanceData = signal<unknown>(null);
  readonly isLoading = this.loading;

  selectedChild = computed(() => this.children().find((c) => c.id === this.selectedChildId()) ?? null);

  attendanceSummary = computed(() => {
    const records = this.rawRecords();
    const present = records.filter((r: any) => r.status === 'PRESENT').length;
    const absent = records.filter((r: any) => r.status === 'ABSENT').length;
    const late = records.filter((r: any) => r.status === 'LATE').length;
    const total = records.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, late, total, percentage };
  });

  attendanceRecords = computed((): AttendanceRowVm[] => {
    return this.rawRecords().map((r: Record<string, unknown>) => this.mapRecord(r));
  });

  constructor(
    private parentService: ParentService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.parentService.getChildren().subscribe({
      next: (data) => {
        this.children.set(data);
        if (!data.length) {
          this.loading.set(false);
          return;
        }
        const qId = this.route.snapshot.queryParamMap.get('childId');
        const initial =
          qId && data.some((c) => c.id === qId) ? qId! : data[0].id;
        this.selectedChildId.set(initial);
        this.loadAttendance(initial);
      },
      error: () => {
        this.error.set('Error al cargar hijos');
        this.loading.set(false);
      },
    });
  }

  selectChild(id: string) {
    this.selectedChildId.set(id);
    this.loadAttendance(id);
  }

  loadAttendance(childId: string) {
    this.loading.set(true);
    this.error.set('');
    this.parentService.getChildAttendance(childId).subscribe({
      next: (data) => {
        this.attendanceData.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la asistencia.');
        this.attendanceData.set(null);
        this.loading.set(false);
      },
    });
  }

  getChildName(c: Child): string {
    return `${c.user.firstName} ${c.user.lastName}`;
  }

  private rawRecords(): Record<string, unknown>[] {
    const d = this.attendanceData();
    if (!d) return [];
    if (Array.isArray(d)) return d as Record<string, unknown>[];
    const rec = (d as Record<string, unknown>)['records'];
    if (Array.isArray(rec)) return rec as Record<string, unknown>[];
    return [];
  }

  private mapRecord(r: Record<string, unknown>): AttendanceRowVm {
    const statusUpper = String(r['status'] ?? '').toUpperCase();
    let statusClass: AttendanceRowVm['statusClass'] = 'otro';
    let statusLabel = String(r['status'] ?? '—');

    if (statusUpper === 'PRESENT') {
      statusClass = 'presente';
      statusLabel = 'Presente';
    } else if (statusUpper === 'ABSENT') {
      statusClass = 'ausente';
      statusLabel = 'Ausente';
    } else if (statusUpper === 'LATE') {
      statusClass = 'tardanza';
      statusLabel = 'Tardanza';
    }

    const dateRaw = r['date'] ?? r['attendanceDate'] ?? r['day'];
    const dateStr =
      dateRaw != null
        ? typeof dateRaw === 'string'
          ? dateRaw
          : (dateRaw as Date).toISOString?.() ?? String(dateRaw)
        : '';

    const notes = (r['notes'] as string) ?? (r['observation'] as string) ?? '';
    const recordedAt = r['recordedAt'] ?? r['createdAt'];

    let time = '';
    if (recordedAt) {
      const dt = new Date(String(recordedAt));
      if (!Number.isNaN(dt.getTime())) {
        time = dt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      }
    }

    return {
      date: dateStr,
      statusRaw: statusUpper,
      statusClass,
      statusLabel,
      time,
      observation: notes,
    };
  }
}
