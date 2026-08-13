import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AcademicYearItem } from '../../../services/admin.service';

@Component({
  selector: 'app-configuracion-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion-admin.component.html',
  styleUrl: './configuracion-admin.component.css'
})
export class ConfiguracionAdminComponent implements OnInit {
  saved = signal(false);
  years = signal<AcademicYearItem[]>([]);

  schoolData = signal({
    name: 'Colegio Santa María Laura',
    address: 'Av. Principal 123',
    phone: '+51 987 654 321',
    email: 'contacto@santamarialaura.edu.pe',
  });

  activeYear = computed(() =>
    this.years().find(y => y.status === 'ACTIVE') ?? this.years()[0] ?? null
  );

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.adminService.getAcademicYears().subscribe({
      next: (years) => this.years.set(years),
      error: () => this.years.set([]),
    });
  }

  patchSchool(field: 'name' | 'address' | 'phone' | 'email', value: string) {
    this.schoolData.update(d => ({ ...d, [field]: value }));
  }

  saveSettings() {
    this.saved.set(true);
    window.setTimeout(() => this.saved.set(false), 2800);
  }
}
