import { Component } from '@angular/core';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { isTeacherCourseWorkspaceUrl } from '../teacher-course-workspace';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [NavbarComponent, RouterOutlet],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
  host: {
    '[class.course-workspace]': 'courseWorkspace',
  },
})
export class MainLayoutComponent {
  courseWorkspace = false;

  constructor(router: Router) {
    this.courseWorkspace = isTeacherCourseWorkspaceUrl(router.url);
    router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(e => {
      this.courseWorkspace = isTeacherCourseWorkspaceUrl(e.urlAfterRedirects);
    });
  }
}
