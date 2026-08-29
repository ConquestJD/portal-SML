import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  AdminService,
  CampusAttendanceDay,
  CampusScanResult,
} from '../../../services/admin.service';

@Component({
  selector: 'app-asistencia-ingreso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './asistencia-ingreso.component.html',
  styleUrl: './asistencia-ingreso.component.css',
})
export class AsistenciaIngresoComponent implements OnInit, OnDestroy {
  @ViewChild('scanInput') scanInput?: ElementRef<HTMLInputElement>;

  clock = signal('');
  scanning = signal(false);
  error = signal('');
  day = signal<CampusAttendanceDay | null>(null);
  last = signal<CampusScanResult | null>(null);
  flash = signal<'ok' | 'late' | 'dup' | 'err' | ''>('');

  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly router = inject(Router);
  private readonly admin = inject(AdminService);
  private buffer = '';
  private lastKeyAt = 0;
  private clockTimer?: ReturnType<typeof setInterval>;
  private pollTimer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    if (!this.browser) return;
    document.body.style.overflow = 'hidden';
    this.tickClock();
    this.clockTimer = setInterval(() => this.tickClock(), 1000);
    this.loadDay();
    this.pollTimer = setInterval(() => this.loadDay(), 20000);
    queueMicrotask(() => this.focusScanner());
  }

  ngOnDestroy() {
    if (this.browser) document.body.style.overflow = '';
    clearInterval(this.clockTimer);
    clearInterval(this.pollTimer);
  }

  close() {
    void this.router.navigate(['/admin/dashboard']);
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
      if (target !== this.scanInput?.nativeElement) return;
    }
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    const now = Date.now();
    if (now - this.lastKeyAt > 60) this.buffer = '';
    this.lastKeyAt = now;

    if (event.key === 'Enter') {
      const code = this.buffer.trim();
      this.buffer = '';
      event.preventDefault();
      if (code) this.submitCode(code);
      return;
    }
    if (event.key.length === 1) {
      this.buffer += event.key;
      event.preventDefault();
    }
  }

  onHiddenInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const code = (input.value ?? '').trim();
    if (!code) return;
    input.value = '';
    this.submitCode(code);
  }

  focusScanner() {
    this.scanInput?.nativeElement.focus();
  }

  loadDay() {
    this.admin.getCampusAttendance().subscribe({
      next: (day) => this.day.set(day),
      error: () => {},
    });
  }

  submitCode(raw: string) {
    const code = raw.replace(/[\u0000-\u001F]/g, '').trim();
    if (!code || this.scanning()) return;
    this.scanning.set(true);
    this.error.set('');
    this.admin.scanCampusAttendance(code).subscribe({
      next: (result) => {
        this.last.set(result);
        this.flash.set(result.duplicate ? 'dup' : result.status === 'LATE' ? 'late' : 'ok');
        this.scanning.set(false);
        this.loadDay();
        this.focusScanner();
      },
      error: (err) => {
        this.last.set(null);
        this.flash.set('err');
        this.error.set(
          err?.error?.error?.message ?? 'No se reconoció el carnet. Vuelve a acercarlo al lector.',
        );
        this.scanning.set(false);
        this.focusScanner();
      },
    });
  }

  statusLabel(hit: CampusScanResult): string {
    if (hit.duplicate) return 'Ya registrado';
    return hit.status === 'LATE' ? 'Tardanza' : 'A tiempo';
  }

  formatTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  gradeLine(grade: string, level: string): string {
    return [grade, level].filter(Boolean).join(' · ');
  }

  private tickClock() {
    this.clock.set(
      new Date().toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    );
  }
}
