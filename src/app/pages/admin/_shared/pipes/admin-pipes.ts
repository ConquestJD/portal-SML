import { Pipe, PipeTransform } from '@angular/core';
import {
  userStatusLabel, paymentStatusLabel, enrollmentStatusLabel,
  userStatusBadgeClass, paymentStatusBadgeClass,
  roleLabel, relationshipLabel, levelLabel, RoleKind,
} from '../models/role.model';

type StatusKind = 'user' | 'payment' | 'enrollment';

@Pipe({ name: 'statusLabel', standalone: true })
export class StatusLabelPipe implements PipeTransform {
  transform(value: string | null | undefined, kind: StatusKind = 'user'): string {
    switch (kind) {
      case 'payment':    return paymentStatusLabel(value);
      case 'enrollment': return enrollmentStatusLabel(value);
      case 'user':
      default:           return userStatusLabel(value);
    }
  }
}

@Pipe({ name: 'statusBadge', standalone: true })
export class StatusBadgePipe implements PipeTransform {
  transform(value: string | null | undefined, kind: Exclude<StatusKind, 'enrollment'> = 'user'): string {
    return kind === 'payment' ? paymentStatusBadgeClass(value) : userStatusBadgeClass(value);
  }
}

@Pipe({ name: 'roleLabel', standalone: true })
export class RoleLabelPipe implements PipeTransform {
  transform(value: RoleKind | string | null | undefined): string {
    return roleLabel(value);
  }
}

@Pipe({ name: 'relationshipLabel', standalone: true })
export class RelationshipLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return relationshipLabel(value);
  }
}

@Pipe({ name: 'levelLabel', standalone: true })
export class LevelLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return levelLabel(value);
  }
}

export const ADMIN_SHARED_PIPES = [
  StatusLabelPipe, StatusBadgePipe, RoleLabelPipe, RelationshipLabelPipe, LevelLabelPipe,
] as const;
