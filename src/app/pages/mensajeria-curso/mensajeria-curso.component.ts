import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MessagingService, Conversation, Message } from '../../services/messaging.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-mensajeria-curso',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './mensajeria-curso.component.html',
  styleUrl: './mensajeria-curso.component.css'
})
export class MensajeriaCursoComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  courseId = signal('');
  newMessage = signal('');
  sending = signal(false);
  readonly isLoading = this.loading;

  conversations = signal<Conversation[]>([]);
  selectedConversation = signal<Conversation | null>(null);

  constructor(
    private route: ActivatedRoute,
    private messagingService: MessagingService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const cId = this.route.snapshot.paramMap.get('courseId') ??
      this.route.snapshot.paramMap.get('id') ?? '';
    this.courseId.set(cId);
    this.loadConversations();
  }

  loadConversations() {
    this.loading.set(true);
    this.messagingService.getConversations(
      this.courseId() ? { courseId: this.courseId() } : {}
    ).subscribe({
      next: (data) => { this.conversations.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar conversaciones'); this.loading.set(false); }
    });
  }

  selectConversation(conv: Conversation) {
    this.messagingService.getConversation(conv.id).subscribe({
      next: (data) => {
        this.selectedConversation.set(data);
        this.messagingService.markAsRead(conv.id).subscribe();
      }
    });
  }

  sendMessage() {
    const conv = this.selectedConversation();
    const content = this.newMessage().trim();
    if (!conv || !content) return;
    this.sending.set(true);
    this.messagingService.sendMessage(conv.id, content).subscribe({
      next: (msg) => {
        this.selectedConversation.update(c => c ? {
          ...c,
          messages: [...(c.messages ?? []), msg]
        } : c);
        this.newMessage.set('');
        this.sending.set(false);
      },
      error: () => this.sending.set(false)
    });
  }

  getCurrentUserId(): string { return this.authService.user()?.id ?? ''; }

  getParticipantName(conv: Conversation): string {
    const user = this.authService.user();
    const other = conv.participants.find(p => p.id !== user?.id);
    return other ? `${other.firstName} ${other.lastName}` : 'Desconocido';
  }
}
