import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { TeacherService, Material } from '../../../services/teacher.service';

@Component({
  selector: 'app-subir-material',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './subir-material.component.html',
  styleUrl: './subir-material.component.css'
})
export class SubirMaterialComponent implements OnInit {
  courseId = signal('');
  materialId = signal('');
  isEditMode = signal(false);
  isLoading = signal(false);
  error = signal('');
  success = signal('');
  selectedFiles: File[] = [];

  formData = signal({ title: '', description: '' });
  existingMaterial = signal<Material | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teacherService: TeacherService
  ) {}

  ngOnInit() {
    const cId = this.route.snapshot.paramMap.get('courseId') ?? '';
    const mId = this.route.snapshot.paramMap.get('materialId') ?? '';
    this.courseId.set(cId);

    if (mId && mId !== 'nuevo') {
      this.materialId.set(mId);
      this.isEditMode.set(true);
      this.teacherService.getMaterials(cId).subscribe({
        next: (materials) => {
          const mat = materials.find(m => m.id === mId);
          if (mat) {
            this.existingMaterial.set(mat);
            this.formData.set({ title: mat.title, description: mat.description ?? '' });
          }
        }
      });
    }
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = Array.from(input.files ?? []);
  }

  onSubmit() {
    this.isLoading.set(true);
    this.error.set('');
    const d = this.formData();

    if (this.isEditMode()) {
      this.teacherService.updateMaterial(this.courseId(), this.materialId(), d).subscribe({
        next: () => {
          this.success.set('Material actualizado');
          this.isLoading.set(false);
          this.router.navigate([`/profesor/cursos/${this.courseId()}`]);
        },
        error: (err) => { this.error.set(err?.error?.error?.message ?? 'Error'); this.isLoading.set(false); }
      });
    } else {
      const fd = new FormData();
      fd.append('title', d.title);
      if (d.description) fd.append('description', d.description);
      this.selectedFiles.forEach(f => fd.append('files', f));
      this.teacherService.createMaterial(this.courseId(), fd).subscribe({
        next: () => {
          this.success.set('Material subido correctamente');
          this.isLoading.set(false);
          this.router.navigate([`/profesor/cursos/${this.courseId()}`]);
        },
        error: (err) => { this.error.set(err?.error?.error?.message ?? 'Error'); this.isLoading.set(false); }
      });
    }
  }

  update(field: string, value: string) { this.formData.update(d => ({ ...d, [field]: value })); }
}
