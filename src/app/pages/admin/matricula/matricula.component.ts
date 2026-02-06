import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Component for student enrollment

@Component({
  selector: 'app-matricula',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './matricula.component.html',
  styleUrl: './matricula.component.css'
})
export class MatriculaComponent {
  formData = signal({
    studentId: '',
    grade: '',
    section: '',
    academicYear: '2024'
  });

  enrollStudent() {
    console.log('Matricular estudiante', this.formData());
  }
}
