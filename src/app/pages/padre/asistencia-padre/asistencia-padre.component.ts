import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ParentService, Child } from '../../../services/parent.service';

@Component({
  selector: 'app-asistencia-padre',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './asistencia-padre.component.html',
  styleUrl: './asistencia-padre.component.css'
})
export class AsistenciaPadreComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedChildId = signal('');
  children = signal<Child[]>([]);
  attendanceData = signal<any>(null);
  readonly isLoading = this.loading;
  readonly selectedChild = this.selectedChildId;

  attendanceSummary = computed(() => {
    const d = this.attendanceData();
    if (!d) return { present: 0, absent: 0, late: 0, total: 0, percentage: 0 };
    const records: any[] = Array.isArray(d) ? d : (d.records ?? []);
    const present = records.filter((r: any) => r.status === 'PRESENT').length;
    const absent = records.filter((r: any) => r.status === 'ABSENT').length;
    const late = records.filter((r: any) => r.status === 'LATE').length;
    const total = records.length;
    return { present, absent, late, total, percentage: total > 0 ? Math.round(present / total * 100) : 0 };
  });

  constructor(private parentService: ParentService) {}

  ngOnInit() {
    this.parentService.getChildren().subscribe({
      next: (data) => {
        this.children.set(data);
        if (data.length) { this.selectedChildId.set(data[0].id); this.loadAttendance(data[0].id); }
        this.loading.set(false);
      }
    });
  }

  selectChild(id: string) { this.selectedChildId.set(id); this.loadAttendance(id); }

  loadAttendance(childId: string) {
    this.parentService.getChildAttendance(childId).subscribe({
      next: (data) => this.attendanceData.set(data)
    });
  }

  getChildName(c: Child): string { return `${c.user.firstName} ${c.user.lastName}`; }
  getData(): any { return this.attendanceData(); }
}
