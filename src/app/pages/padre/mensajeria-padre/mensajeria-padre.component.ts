import { Component, signal, computed, OnInit, viewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { MessagingService } from '../../../services/messaging.service';
import { ParentService, Child } from '../../../services/parent.service';
import { AuthService } from '../../../services/auth.service';

export interface PadreConvoSummary {
  id: string;
  /** TeacherAssignment.id — para abrir chat desde el curso. */
  teacherAssignmentId: string;
  participantName: string;
  participantTitle: string;
  participantAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface PadreChatMessage {
  id: string;
  content: string;
  timestamp: string;
  senderRole: 'padre' | 'profesor';
  mine: boolean;
}

export interface PadreConversationDetail extends PadreConvoSummary {
  messages: PadreChatMessage[];
}

type ThreadBlock =
  | { type: 'day'; id: string; label: string }
  | { type: 'msg'; id: string; message: PadreChatMessage };

@Component({
  selector: 'app-mensajeria-padre',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './mensajeria-padre.component.html',
  styleUrl: './mensajeria-padre.component.css',
})
export class MensajeriaPadreComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedChildId = signal('');
  draftMessage = '';
  sending = signal(false);
  readonly isLoading = this.loading;
  readonly isSending = this.sending;

  children = signal<Child[]>([]);
  summaries = signal<PadreConvoSummary[]>([]);
  activeDetail = signal<PadreConversationDetail | null>(null);
  convoQuery = signal('');
  private readonly threadEl = viewChild<ElementRef<HTMLElement>>('threadEl');

  selectedChild = computed(() => this.children().find((c) => c.id === this.selectedChildId()) ?? null);

  filteredConversations = computed(() => {
    const q = this.convoQuery().trim().toLowerCase();
    const list = this.summaries();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.participantName.toLowerCase().includes(q) ||
        c.participantTitle.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q),
    );
  });

  totalUnreadCount = computed(() =>
    this.summaries().reduce((a, s) => a + (Number(s.unreadCount) || 0), 0),
  );

  threadBlocks = computed((): ThreadBlock[] => {
    const msgs = this.activeDetail()?.messages ?? [];
    const blocks: ThreadBlock[] = [];
    let lastKey = '';
    for (const message of msgs) {
      const key = this.dayKey(message.timestamp);
      if (key && key !== lastKey) {
        blocks.push({ type: 'day', id: `day-${key}`, label: this.dayLabel(key) });
        lastKey = key;
      }
      blocks.push({ type: 'msg', id: message.id, message });
    }
    return blocks;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private messagingService: MessagingService,
    private parentService: ParentService,
    private authService: AuthService,
  ) {
    effect(() => {
      this.threadBlocks();
      this.scrollThread();
    });
  }

  ngOnInit() {
    this.parentService.getChildren().subscribe({
      next: (data) => {
        this.children.set(data);
        if (!data.length) {
          this.loading.set(false);
          return;
        }
        const qId = this.route.snapshot.queryParamMap.get('childId');
        const initial =
          qId && data.some((c) => c.id === qId) ? qId! : data[0].id;
        this.selectedChildId.set(initial);
        this.loadConversations(initial);
      },
      error: () => {
        this.error.set('Error al cargar hijos');
        this.loading.set(false);
      },
    });
  }

  selectChild(id: string) {
    this.selectedChildId.set(id);
    this.activeDetail.set(null);
    this.convoQuery.set('');
    this.loadConversations(id);
  }

  loadConversations(childId: string) {
    this.loading.set(true);
    this.error.set('');
    this.summaries.set([]);
    this.messagingService.getConversations({ childId }).subscribe({
      next: (raw) => {
        const myId = this.authService.user()?.id ?? '';
        const list = Array.isArray(raw) ? raw : [];
        this.summaries.set(
          list.map((r) => this.mapSummary(r as unknown as Record<string, unknown>, myId)),
        );
        this.loading.set(false);
        const assignmentId = this.route.snapshot.queryParamMap.get('assignmentId') ?? '';
        const teacherId = this.route.snapshot.queryParamMap.get('teacherId') ?? '';
        if (assignmentId) {
          this.openAssignmentFromQuery(assignmentId, teacherId);
        }
      },
      error: () => {
        this.error.set('No se pudieron cargar las conversaciones.');
        this.summaries.set([]);
        this.loading.set(false);
      },
    });
  }

  selectConversation(s: PadreConvoSummary) {
    this.messagingService.getConversation(s.id).subscribe({
      next: (raw) => {
        const myId = this.authService.user()?.id ?? '';
        const messages = this.mapMessages(raw as unknown as Record<string, unknown>, myId);
        this.activeDetail.set({
          ...s,
          unreadCount: 0,
          messages,
        });
        this.summaries.update((list) =>
          list.map((row) => (row.id === s.id ? { ...row, unreadCount: 0 } : row)),
        );
        this.messagingService.markAsRead(s.id).subscribe();
      },
    });
  }

  sendMessage() {
    const conv = this.activeDetail();
    const content = this.draftMessage.trim();
    if (!conv || !content) return;
    this.sending.set(true);
    this.messagingService.sendMessage(conv.id, content).subscribe({
      next: (msg) => {
        const myId = this.authService.user()?.id ?? '';
        const mapped = this.mapOneMessage(msg as unknown as Record<string, unknown>, myId, true);
        this.activeDetail.update((c) =>
          c ? { ...c, messages: [...(c.messages ?? []), mapped] } : c,
        );
        this.draftMessage = '';
        this.sending.set(false);
      },
      error: () => this.sending.set(false),
    });
  }

  onEnterKey(ev: KeyboardEvent) {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      this.sendMessage();
    }
  }

  closeConversation() {
    this.activeDetail.set(null);
  }

  formatTime(iso: string | undefined | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    const diff = Date.now() - d.getTime();
    const min = Math.round(diff / 60000);
    if (min < 1) return 'Ahora';
    if (min < 60) return `${min} min`;
    const today = this.dayKey(new Date().toISOString());
    if (this.dayKey(iso) === today) {
      return d.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
    }
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    if (this.dayKey(iso) === this.dayKey(yest.toISOString())) return 'Ayer';
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  }

  formatMessageDate(iso: string | undefined | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
  }

  formatTimestamp(iso: string | undefined | null): string {
    return this.formatTime(iso);
  }

  getChildName(c: Child): string {
    return `${c.user.firstName} ${c.user.lastName}`;
  }

  getChildGrade(c: Child): string {
    const grade = c.grade ?? c.enrollments?.[0]?.section?.grade ?? '';
    const level = c.level ?? c.enrollments?.[0]?.section?.level ?? '';
    return [grade, level].filter(Boolean).join(' · ');
  }

  childPhoto(c: Child): string | null {
    return c.photo || c.user?.avatarUrl || null;
  }

  private mapSummary(conv: Record<string, unknown>, _myUserId: string): PadreConvoSummary {
    const teacherUser = this.teacherUserFrom(conv);
    const ta = conv['teacherAssignment'] as Record<string, unknown> | undefined;
    const course = ta?.['course'] as Record<string, unknown> | undefined;
    const courseName = (course?.['name'] as string) ?? '';

    const pName = teacherUser
      ? `${teacherUser['firstName'] ?? ''} ${teacherUser['lastName'] ?? ''}`.trim()
      : '';

    const msgs = conv['messages'] as Record<string, unknown>[] | undefined;
    const last = Array.isArray(msgs) && msgs.length ? msgs[0] : null;
    const lastContent = (last?.['content'] as string) ?? '';
    const lastAt = (last?.['createdAt'] as string) ?? (conv['updatedAt'] as string) ?? '';

    return {
      id: String(conv['id'] ?? ''),
      teacherAssignmentId: String(ta?.['id'] ?? conv['teacherAssignmentId'] ?? ''),
      participantName: pName || 'Profesor',
      participantTitle: courseName,
      participantAvatar: (teacherUser?.['avatarUrl'] as string) ?? null,
      lastMessage: lastContent,
      lastMessageTime: lastAt,
      unreadCount: Number(conv['unreadCount'] ?? 0) || 0,
    };
  }

  private openAssignmentFromQuery(assignmentId: string, teacherId: string) {
    const match = this.summaries().find((s) => s.teacherAssignmentId === assignmentId);
    if (match) {
      this.selectConversation(match);
      this.clearOpenChatQueryParams();
      return;
    }
    if (!teacherId) {
      this.clearOpenChatQueryParams();
      return;
    }
    const parentId = this.selectedChild()?.parentRecordId ?? '';
    if (!parentId) {
      this.error.set(
        'No se pudo abrir el chat automáticamente. Usa la lista de conversaciones o contacta a secretaría.',
      );
      this.clearOpenChatQueryParams();
      return;
    }
    this.messagingService
      .createConversation({
        teacherId,
        parentId,
        teacherAssignmentId: assignmentId,
        subject: 'Consulta del apoderado',
      })
      .subscribe({
        next: (conv) => {
          const myId = this.authService.user()?.id ?? '';
          const s = this.mapSummary(conv as unknown as Record<string, unknown>, myId);
          this.summaries.update((list) => (list.some((x) => x.id === s.id) ? list : [s, ...list]));
          this.selectConversation(s);
          this.clearOpenChatQueryParams();
        },
        error: () => {
          this.error.set('No se pudo iniciar la conversación con el docente.');
          this.clearOpenChatQueryParams();
        },
      });
  }

  private clearOpenChatQueryParams() {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { assignmentId: null, teacherId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private teacherUserFrom(conv: Record<string, unknown>): Record<string, unknown> | null {
    const parts = conv['participants'] as unknown[] | undefined;
    if (!Array.isArray(parts)) return null;
    for (const p of parts) {
      const pr = p as Record<string, unknown>;
      const t = pr['teacher'] as Record<string, unknown> | undefined;
      const u = t?.['user'] as Record<string, unknown> | undefined;
      if (u) return u;
    }
    for (const p of parts) {
      const pr = p as Record<string, unknown>;
      if (pr['firstName'] != null) return pr;
    }
    return null;
  }

  private mapMessages(conv: Record<string, unknown>, myUserId: string): PadreChatMessage[] {
    const msgs = conv['messages'] as unknown[] | undefined;
    if (!Array.isArray(msgs)) return [];
    return msgs.map((m) => this.mapOneMessage(m as Record<string, unknown>, myUserId));
  }

  private mapOneMessage(
    m: Record<string, unknown>,
    myUserId: string,
    forceMine = false,
  ): PadreChatMessage {
    const sender = m['sender'] as Record<string, unknown> | undefined;
    const sid = String(m['senderId'] ?? sender?.['id'] ?? '');
    const roleObj = sender?.['role'] as Record<string, unknown> | undefined;
    const role = String(roleObj?.['name'] ?? '').toUpperCase();
    const mine = forceMine || (!!myUserId && sid === myUserId) || role === 'PARENT';
    return {
      id: String(m['id'] ?? ''),
      content: String(m['content'] ?? ''),
      timestamp: String(m['createdAt'] ?? ''),
      senderRole: mine ? 'padre' : 'profesor',
      mine,
    };
  }

  private scrollThread() {
    setTimeout(() => {
      const el = this.threadEl()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 40);
  }

  private dayKey(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private dayLabel(key: string): string {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, (m || 1) - 1, d || 1);
    const today = new Date();
    if (key === this.dayKey(today.toISOString())) return 'Hoy';
    const yest = new Date(today);
    yest.setDate(today.getDate() - 1);
    if (key === this.dayKey(yest.toISOString())) return 'Ayer';
    const label = date.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
}
