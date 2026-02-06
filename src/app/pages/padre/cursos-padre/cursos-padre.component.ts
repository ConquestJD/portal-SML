import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cursos-padre',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cursos-padre.component.html',
  styleUrl: './cursos-padre.component.css'
})
export class CursosPadreComponent {
  selectedChild = signal('1');
  searchQuery = signal('');
  
  children = signal([
    { id: '1', name: 'María Rodríguez', grade: '3ro', section: 'A' }
  ]);

  courses = signal([
    { id: '1', code: 'MAT-2024', name: 'Matemática', teacher: 'Prof. Ana Martínez', schedule: 'Lun, Mié, Vie 8:00-9:30', average: 15.5 },
    { id: '2', code: 'LEN-2024', name: 'Lengua y Literatura', teacher: 'Prof. Carlos López', schedule: 'Mar, Jue 8:00-9:30', average: 16.0 },
    { id: '3', code: 'CIE-2024', name: 'Ciencias', teacher: 'Prof. Laura García', schedule: 'Lun, Mié 10:00-11:30', average: 14.5 }
  ]);

  filteredCourses = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.courses();
    return this.courses().filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.code.toLowerCase().includes(query) ||
      c.teacher.toLowerCase().includes(query)
    );
  });
}
