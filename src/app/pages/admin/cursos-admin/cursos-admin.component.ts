import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface Schedule {
  day: string;
  startTime: string;
  endTime: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
  level: 'secundaria' | 'primaria' | 'inicial';
  grade: string;
  status: 'activo' | 'inactivo';
  students: number;
  classroom?: string;
  schedule: Schedule[];
}

@Component({
  selector: 'app-cursos-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cursos-admin.component.html',
  styleUrl: './cursos-admin.component.css'
})
export class CursosAdminComponent {
  selectedGrade = signal<string>('');
  
  courses = signal<Course[]>([
    {
      id: '1',
      code: 'MAT-2024-3',
      name: 'Matemática',
      level: 'secundaria',
      grade: '3ro',
      status: 'activo',
      students: 30,
      classroom: 'Aula 201',
      schedule: [
        { day: 'Lunes', startTime: '08:00', endTime: '09:30' },
        { day: 'Miércoles', startTime: '08:00', endTime: '09:30' },
        { day: 'Viernes', startTime: '08:00', endTime: '09:30' }
      ]
    },
    {
      id: '2',
      code: 'LEN-2024-3',
      name: 'Lengua y Literatura',
      level: 'secundaria',
      grade: '3ro',
      status: 'activo',
      students: 30,
      classroom: 'Aula 202',
      schedule: [
        { day: 'Martes', startTime: '10:00', endTime: '11:30' },
        { day: 'Jueves', startTime: '10:00', endTime: '11:30' }
      ]
    },
    {
      id: '3',
      code: 'CIE-2024-3',
      name: 'Ciencias',
      level: 'secundaria',
      grade: '3ro',
      status: 'activo',
      students: 30,
      classroom: 'Aula 203',
      schedule: [
        { day: 'Lunes', startTime: '10:00', endTime: '11:30' },
        { day: 'Miércoles', startTime: '10:00', endTime: '11:30' }
      ]
    },
    {
      id: '4',
      code: 'MAT-2024-4',
      name: 'Matemática',
      level: 'secundaria',
      grade: '4to',
      status: 'activo',
      students: 28,
      classroom: 'Aula 301',
      schedule: [
        { day: 'Lunes', startTime: '08:00', endTime: '09:30' },
        { day: 'Jueves', startTime: '08:00', endTime: '09:30' }
      ]
    },
    {
      id: '5',
      code: 'LEN-2024-4',
      name: 'Lengua y Literatura',
      level: 'secundaria',
      grade: '4to',
      status: 'activo',
      students: 28,
      classroom: 'Aula 302',
      schedule: [
        { day: 'Martes', startTime: '10:00', endTime: '11:30' },
        { day: 'Viernes', startTime: '10:00', endTime: '11:30' }
      ]
    }
  ]);

  availableGrades = computed(() => {
    const grades = new Set(this.courses().map(c => c.grade));
    return Array.from(grades).sort();
  });

  filteredCourses = computed(() => {
    if (!this.selectedGrade()) {
      return [];
    }
    return this.courses().filter(c => c.grade === this.selectedGrade() && c.status === 'activo');
  });

  getCoursesCountByGrade = (grade: string): number => {
    return this.courses().filter(c => c.grade === grade && c.status === 'activo').length;
  };

  weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  timeSlots = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  selectGrade(grade: string) {
    this.selectedGrade.set(grade);
  }

  getCourseForTimeSlot(day: string, time: string): Course | null {
    const courses = this.filteredCourses();
    for (const course of courses) {
      for (const schedule of course.schedule) {
        if (schedule.day === day) {
          const start = this.timeToMinutes(schedule.startTime);
          const end = this.timeToMinutes(schedule.endTime);
          const slot = this.timeToMinutes(time);
          // Verificar si este slot es el inicio del curso
          if (slot === start || (slot >= start && slot < end)) {
            return course;
          }
        }
      }
    }
    return null;
  }

  isCourseStart(day: string, time: string, course: Course): boolean {
    for (const schedule of course.schedule) {
      if (schedule.day === day) {
        const start = this.timeToMinutes(schedule.startTime);
        const slot = this.timeToMinutes(time);
        return slot === start;
      }
    }
    return false;
  }

  timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  getCourseSpan(day: string, course: Course): number {
    for (const schedule of course.schedule) {
      if (schedule.day === day) {
        const start = this.timeToMinutes(schedule.startTime);
        const end = this.timeToMinutes(schedule.endTime);
        const duration = end - start;
        // Cada slot es de 60 minutos, calcular cuántos slots ocupa
        return Math.ceil(duration / 60);
      }
    }
    return 1;
  }

  getCourseStartSlot(day: string, course: Course): number {
    for (const schedule of course.schedule) {
      if (schedule.day === day) {
        const start = this.timeToMinutes(schedule.startTime);
        const slot = Math.floor(start / 60) - 7; // Empezamos a las 7:00
        return Math.max(0, slot);
      }
    }
    return 0;
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  }

  getScheduleForDay(course: Course, day: string): Schedule | null {
    return course.schedule.find(s => s.day === day) || null;
  }
}
