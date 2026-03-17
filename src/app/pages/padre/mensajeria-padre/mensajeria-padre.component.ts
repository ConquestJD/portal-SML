import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessagingService, Conversation } from '../../../services/messaging.service';
import { ParentService, Child } from '../../../services/parent.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-mensajeria-padre',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './mensajeria-padre.component.html',
  styleUrl: './mensajeria-padre.component.css'
})
export class MensajeriaPadreComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  selectedChildId = signal('');
  newMessage = signal('');
  sending = signal(false);
  readonly isLoading = this.loading;

  children = signal<Child[]>([]);
  conversations = signal<Conversation[]>([]);
  selectedConversation = signal<Conversation | null>(null);

  constructor(
    private messagingService: MessagingService,
    private parentService: ParentService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.parentService.getChildren().subscribe({
      next: (data) => {
        this.children.set(data);
        if (data.length) { this.selectedChildId.set(data[0].id); this.loadConversations(data[0].id); }
        this.loading.set(false);
      }
    });
  }

  selectChild(id: string) { this.selectedChildId.set(id); this.loadConversations(id); }

  loadConversations(childId: string) {
    this.messagingService.getConversations({ childId }).subscribe({
      next: (data) => this.conversations.set(data)
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
        this.selectedConversation.update(c => c ? { ...c, messages: [...(c.messages ?? []), msg] } : c);
        this.newMessage.set('');
        this.sending.set(false);
      },
      error: () => this.sending.set(false)
    });
  }

  getChildName(c: Child): string { return `${c.user.firstName} ${c.user.lastName}`; }

  getParticipantName(conv: Conversation): string {
    const user = this.authService.user();
    const other = conv.participants.find(p => p.id !== user?.id);
    return other ? `${other.firstName} ${other.lastName}` : 'Desconocido';
  }
}
