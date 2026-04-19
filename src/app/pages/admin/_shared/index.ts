/**
 * Barrel de exports de los primitivos compartidos del módulo admin.
 * Importar desde aquí para que los templates sean concisos.
 *
 *   import { ADMIN_SHARED } from '../_shared';
 *   @Component({ ..., imports: [..., ...ADMIN_SHARED] })
 */

import { AdminStatusBadgeComponent } from './components/status-badge/admin-status-badge.component';
import { AdminEmptyStateComponent } from './components/empty-state/admin-empty-state.component';
import { AdminBreadcrumbComponent } from './components/breadcrumb/admin-breadcrumb.component';
import { AdminPersonHeaderComponent } from './components/person-header/admin-person-header.component';
import { AdminInfoCardComponent, AdminInfoItemComponent } from './components/info-card/admin-info-card.component';
import { AdminTabsComponent } from './components/tabs/admin-tabs.component';
import { AdminGradeSelectorComponent } from './components/grade-selector/admin-grade-selector.component';
import {
  StatusLabelPipe, StatusBadgePipe, RoleLabelPipe, RelationshipLabelPipe, LevelLabelPipe,
} from './pipes/admin-pipes';

export * from './models/role.model';
export * from './pipes/admin-pipes';
export * from './components/status-badge/admin-status-badge.component';
export * from './components/empty-state/admin-empty-state.component';
export * from './components/breadcrumb/admin-breadcrumb.component';
export * from './components/person-header/admin-person-header.component';
export * from './components/info-card/admin-info-card.component';
export * from './components/tabs/admin-tabs.component';
export * from './components/grade-selector/admin-grade-selector.component';

export const ADMIN_SHARED = [
  AdminStatusBadgeComponent,
  AdminEmptyStateComponent,
  AdminBreadcrumbComponent,
  AdminPersonHeaderComponent,
  AdminInfoCardComponent,
  AdminInfoItemComponent,
  AdminTabsComponent,
  AdminGradeSelectorComponent,
  StatusLabelPipe,
  StatusBadgePipe,
  RoleLabelPipe,
  RelationshipLabelPipe,
  LevelLabelPipe,
] as const;
