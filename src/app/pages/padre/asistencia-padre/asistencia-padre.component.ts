import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

interface Child {
  id: string;
  name: string;
  grade: string;
  section: string;
  photo?: string;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  percentage: number;
  childId: string;
}

interface AttendanceRecord {
  date: string;
  status: 'presente' | 'ausente' | 'tardanza';
  time: string;
  observation: string;
  childId: string;
}

@Component({
  selector: 'app-asistencia-padre',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './asistencia-padre.component.html',
  styleUrl: './asistencia-padre.component.css'
})
export class AsistenciaPadreComponent implements OnInit {
  selectedChildId = signal('1');
  isLoading = signal(true);
  
  children = signal<Child[]>([
    { 
      id: '1', 
      name: 'María Rodríguez', 
      grade: '3ro', 
      section: 'A',
      photo: 'https://via.placeholder.com/60'
    },
    { 
      id: '2', 
      name: 'Pedro Rodríguez', 
      grade: '1ro', 
      section: 'B',
      photo: 'https://via.placeholder.com/60'
    }
  ]);

  allSummaries = signal<AttendanceSummary[]>([]);
  allRecords = signal<AttendanceRecord[]>([]);

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    // Leer query params si existe childId
    this.route.queryParams.subscribe(params => {
      if (params['childId']) {
        this.selectedChildId.set(params['childId']);
      }
    });

    this.loadAttendance();
  }

  loadAttendance() {
    this.isLoading.set(true);
    
    // Simular carga de asistencia
    setTimeout(() => {
      // Resumen y registros para María (3ro A)
      const mariaSummary: AttendanceSummary = {
        present: 45,
        absent: 3,
        late: 2,
        percentage: 90,
        childId: '1'
      };

      const mariaRecords: AttendanceRecord[] = [
        { date: '2024-03-10', status: 'presente', time: '08:15', observation: '', childId: '1' },
        { date: '2024-03-09', status: 'ausente', time: '-', observation: 'Falta justificada', childId: '1' },
        { date: '2024-03-08', status: 'tardanza', time: '08:45', observation: 'Llegó tarde', childId: '1' },
        { date: '2024-03-07', status: 'presente', time: '08:10', observation: '', childId: '1' },
        { date: '2024-03-06', status: 'presente', time: '08:05', observation: '', childId: '1' },
        { date: '2024-03-05', status: 'ausente', time: '-', observation: 'Falta por enfermedad', childId: '1' }
      ];

      // Resumen y registros para Pedro (1ro B)
      const pedroSummary: AttendanceSummary = {
        present: 48,
        absent: 1,
        late: 1,
        percentage: 96,
        childId: '2'
      };

      const pedroRecords: AttendanceRecord[] = [
        { date: '2024-03-10', status: 'presente', time: '08:00', observation: '', childId: '2' },
        { date: '2024-03-09', status: 'presente', time: '08:05', observation: '', childId: '2' },
        { date: '2024-03-08', status: 'tardanza', time: '08:35', observation: 'Llegó tarde', childId: '2' },
        { date: '2024-03-07', status: 'presente', time: '08:02', observation: '', childId: '2' },
        { date: '2024-03-06', status: 'ausente', time: '-', observation: 'Falta justificada', childId: '2' }
      ];

      this.allSummaries.set([mariaSummary, pedroSummary]);
      this.allRecords.set([...mariaRecords, ...pedroRecords]);
      this.isLoading.set(false);
    }, 500);
  }

  selectChild(childId: string) {
    this.selectedChildId.set(childId);
  }

  selectedChild = computed(() => {
    return this.children().find(c => c.id === this.selectedChildId());
  });

  attendanceSummary = computed(() => {
    const summary = this.allSummaries().find(s => s.childId === this.selectedChildId());
    return summary || { present: 0, absent: 0, late: 0, percentage: 0, childId: this.selectedChildId() };
  });

  attendanceRecords = computed(() => {
    return this.allRecords()
      .filter(r => r.childId === this.selectedChildId())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  requestJustification() {
    const child = this.selectedChild();
    console.log('Solicitar justificación para:', child?.name);
  }

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }
}
