import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { TeacherService } from '../../../services/teacher.service';

@Component({
  selector: 'app-ficha-alumno',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ficha-alumno.component.html',
  styleUrl: './ficha-alumno.component.css'
})
export class FichaAlumnoComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  courseId = signal('');
  studentId = signal('');
  studentData = signal<any>(null);

  readonly isLoading = this.loading;

  student = computed(() => this.studentData()?.student ?? {});
  course = computed(() => this.studentData()?.course ?? {});
  academicData = computed(() => this.studentData()?.academic ?? {});
  tasks = computed(() => this.studentData()?.tasks ?? []);
  evaluations = computed(() => this.studentData()?.evaluations ?? []);

  constructor(private route: ActivatedRoute, private teacherService: TeacherService) {}

  ngOnInit() {
    const cId = this.route.snapshot.paramMap.get('courseId') ?? '';
    const sId = this.route.snapshot.paramMap.get('studentId') ?? '';
    this.courseId.set(cId);
    this.studentId.set(sId);
    this.teacherService.getStudentFicha(cId, sId).subscribe({
      next: (data) => { this.studentData.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar ficha del alumno'); this.loading.set(false); }
    });
  }

  getData(): any { return this.studentData(); }
}
