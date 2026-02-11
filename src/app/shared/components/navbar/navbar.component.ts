import { Component, signal, computed, effect, HostListener, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, UserRole } from '../../../services/auth.service';
import { filter, Subscription } from 'rxjs';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_ITEMS_BY_ROLE: Record<UserRole, NavGroup[]> = {
  estudiante: [
    {
      label: 'Principal',
      items: [
        { label: 'Dashboard', icon: 'fas fa-home', path: '/dashboard', exact: true }
      ]
    },
    {
      label: 'Académico',
      items: [
        { label: 'Cursos', icon: 'fas fa-book', path: '/cursos', exact: false },
        { label: 'Tareas', icon: 'fas fa-tasks', path: '/tareas', exact: false },
        { label: 'Notas', icon: 'fas fa-chart-line', path: '/notas', exact: false },
        { label: 'Asistencia', icon: 'fas fa-calendar-check', path: '/asistencia', exact: false }
      ]
    },
    {
      label: 'Comunicación',
      items: [
        { label: 'Comunicados', icon: 'fas fa-bullhorn', path: '/comunicados', exact: false }
      ]
    },
    {
      label: 'Cuenta',
      items: [
        { label: 'Perfil', icon: 'fas fa-user', path: '/perfil', exact: false },
        { label: 'Configuración', icon: 'fas fa-cog', path: '/configuracion', exact: false }
      ]
    }
  ],
  profesor: [
    {
      label: 'Principal',
      items: [
        { label: 'Dashboard', icon: 'fas fa-home', path: '/profesor/dashboard', exact: true }
      ]
    },
    {
      label: 'Académico',
      items: [
        { label: 'Cursos', icon: 'fas fa-book', path: '/profesor/cursos', exact: false },
        { label: 'Tareas', icon: 'fas fa-tasks', path: '/profesor/tareas', exact: false },
        { label: 'Notas', icon: 'fas fa-chart-line', path: '/profesor/notas', exact: false },
        { label: 'Asistencia', icon: 'fas fa-calendar-check', path: '/profesor/asistencia', exact: false }
      ]
    },
    {
      label: 'Comunicación',
      items: [
        { label: 'Comunicados', icon: 'fas fa-bullhorn', path: '/profesor/comunicados', exact: false }
      ]
    },
    {
      label: 'Cuenta',
      items: [
        { label: 'Perfil', icon: 'fas fa-user', path: '/profesor/perfil', exact: false },
        { label: 'Configuración', icon: 'fas fa-cog', path: '/profesor/configuracion', exact: false }
      ]
    }
  ],
  admin: [
    {
      label: 'Principal',
      items: [
        { label: 'Dashboard', icon: 'fas fa-home', path: '/admin/dashboard', exact: true }
      ]
    },
    {
      label: 'Gestión de Usuarios',
      items: [
        { label: 'Usuarios', icon: 'fas fa-users', path: '/admin/usuarios', exact: false },
        { label: 'Estudiantes', icon: 'fas fa-user-graduate', path: '/admin/estudiantes', exact: false },
        { label: 'Profesores', icon: 'fas fa-chalkboard-teacher', path: '/admin/profesores', exact: false },
        { label: 'Padres', icon: 'fas fa-user-friends', path: '/admin/padres', exact: false }
      ]
    },
    {
      label: 'Académico',
      items: [
        { label: 'Cursos', icon: 'fas fa-book', path: '/admin/cursos', exact: false },
        { label: 'Reportes', icon: 'fas fa-chart-bar', path: '/admin/reportes', exact: false }
      ]
    },
    {
      label: 'Cuenta',
      items: [
        { label: 'Perfil', icon: 'fas fa-user', path: '/admin/perfil', exact: false },
        { label: 'Configuración', icon: 'fas fa-cog', path: '/admin/configuracion', exact: false }
      ]
    }
  ],
  padre: [
    {
      label: 'Principal',
      items: [
        { label: 'Dashboard', icon: 'fas fa-home', path: '/padre/dashboard', exact: true }
      ]
    },
    {
      label: 'Información del Hijo',
      items: [
        { label: 'Perfil Hijo', icon: 'fas fa-user', path: '/padre/perfil-hijo', exact: false }
      ]
    },
    {
      label: 'Académico',
      items: [
        { label: 'Cursos', icon: 'fas fa-book', path: '/padre/cursos', exact: false },
        { label: 'Tareas', icon: 'fas fa-tasks', path: '/padre/tareas', exact: false },
        { label: 'Notas', icon: 'fas fa-chart-line', path: '/padre/notas', exact: false },
        { label: 'Asistencia', icon: 'fas fa-calendar-check', path: '/padre/asistencia', exact: false }
      ]
    },
    {
      label: 'Comunicación',
      items: [
        { label: 'Comunicados', icon: 'fas fa-bullhorn', path: '/padre/comunicados', exact: false },
        { label: 'Mensajería', icon: 'fas fa-envelope', path: '/padre/mensajeria', exact: false }
      ]
    },
    {
      label: 'Servicios',
      items: [
        { label: 'Pagos', icon: 'fas fa-dollar-sign', path: '/padre/pagos', exact: false },
        { label: 'Documentos', icon: 'fas fa-file-alt', path: '/padre/documentos', exact: false }
      ]
    },
    {
      label: 'Cuenta',
      items: [
        { label: 'Configuración', icon: 'fas fa-cog', path: '/padre/configuracion', exact: false }
      ]
    }
  ]
};

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  // Estados del sidebar
  isCollapsed = signal(false);
  isDrawerOpen = signal(false);
  isUserDropdownOpen = signal(false);
  notificationsCount = signal(0);
  
  // Computed signals
  user = computed(() => this.authService.user());
  userName = computed(() => this.user()?.name || 'Usuario');
  userPhoto = computed(() => this.user()?.photo);
  userRole = computed(() => this.authService.userRole());
  authenticated = computed(() => this.authService.authenticated());
  
  // Navegación agrupada por rol
  navigationGroups = computed(() => {
    const role = this.userRole();
    if (!role) return [];
    return NAV_ITEMS_BY_ROLE[role] || [];
  });
  
  // Labels de rol para mostrar
  roleLabel = computed(() => {
    const role = this.userRole();
    const labels: Record<UserRole, string> = {
      estudiante: 'Estudiante',
      profesor: 'Profesor',
      admin: 'Administrador',
      padre: 'Padre de Familia'
    };
    return labels[role || 'estudiante'] || 'Usuario';
  });
  
  // Rutas base por rol para el logo
  dashboardRoute = computed(() => {
    const role = this.userRole();
    if (role === 'profesor') return '/profesor/dashboard';
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'padre') return '/padre/dashboard';
    return '/dashboard';
  });
  
  private routerSubscription?: Subscription;
  isMobile = signal(false);
  
  constructor(
    public authService: AuthService,
    private router: Router
  ) {
    // Detectar tamaño de pantalla
    this.checkMobile();
    
    // Cerrar drawer al navegar
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.isDrawerOpen.set(false);
        this.isUserDropdownOpen.set(false);
      });
    
    // Efecto para bloquear scroll del body cuando el drawer está abierto
    effect(() => {
      if (typeof document !== 'undefined') {
        if (this.isDrawerOpen()) {
          document.body.style.overflow = 'hidden';
        } else {
          document.body.style.overflow = '';
        }
      }
    });
  }
  
  ngOnInit() {
    // Detectar cambios de tamaño de ventana
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize.bind(this));
    }
  }
  
  ngOnDestroy() {
    this.routerSubscription?.unsubscribe();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize.bind(this));
    }
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }
  
  @HostListener('window:resize')
  handleResize() {
    this.checkMobile();
  }
  
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-dropdown') && !target.closest('.user-dropdown-trigger')) {
      this.isUserDropdownOpen.set(false);
    }
  }
  
  private checkMobile() {
    if (typeof window !== 'undefined') {
      this.isMobile.set(window.innerWidth < 1024);
      // En mobile, el sidebar siempre debe estar cerrado por defecto
      if (window.innerWidth < 1024) {
        this.isCollapsed.set(false);
      }
    }
  }
  
  toggleSidebar() {
    if (this.isMobile()) {
      this.isDrawerOpen.update(v => !v);
    } else {
      this.isCollapsed.update(v => !v);
    }
  }
  
  closeDrawer() {
    this.isDrawerOpen.set(false);
  }
  
  toggleUserDropdown() {
    this.isUserDropdownOpen.update(v => !v);
  }
  
  logout() {
    this.isUserDropdownOpen.set(false);
    this.authService.logout();
  }
  
  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
