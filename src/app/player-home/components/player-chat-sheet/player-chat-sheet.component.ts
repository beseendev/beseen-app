import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, Input, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, closeOutline, personCircleOutline, sendOutline } from 'ionicons/icons';
import { ChatMessageResponse, InviteStatus } from '../../../models/player-chat.models';
import { ChatService } from '../../../services/chat.service';
import { PostService } from '../../../services/post.service';

@Component({
  selector: 'app-player-chat-sheet',
  templateUrl: './player-chat-sheet.component.html',
  styleUrls: ['./player-chat-sheet.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class PlayerChatSheetComponent implements OnInit, AfterViewChecked {
  @Input({ required: true }) threadId!: number;
  @Input({ required: true }) scoutName!: string;
  @Input() scoutAvatarUrl?: string | null;
  @Input() inviteId?: number;
  @Input() status: InviteStatus = 'PENDING';

  @ViewChild('messagesViewport') messagesViewport?: ElementRef<HTMLDivElement>;

  messages: ChatMessageResponse[] = [];
  draftMessage = '';
  isLoading = false;
  private shouldScrollToBottom = false;

  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly chatService = inject(ChatService);
  private readonly postService = inject(PostService);

  constructor() {
    addIcons({
      checkmarkCircleOutline,
      closeOutline,
      personCircleOutline,
      sendOutline
    });
  }

  ngOnInit(): void {
    this.loadMessages();
  }

  ngAfterViewChecked(): void {
    if (!this.shouldScrollToBottom) {
      return;
    }

    const viewport = this.messagesViewport?.nativeElement;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }

    this.shouldScrollToBottom = false;
  }

  loadMessages(): void {
    if (this.status !== 'ACCEPTED') return;

    this.isLoading = true;
    this.chatService.getMessages(this.threadId).subscribe({
      next: (msgs) => {
        this.messages = msgs.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        this.isLoading = false;
        this.shouldScrollToBottom = true;
      },
      error: (err) => {
        console.error('Error loading messages', err);
        this.isLoading = false;
      }
    });
  }

  get statusLabel(): string {
    if (this.status === 'ACCEPTED') {
      return 'Chat liberado';
    }
    if (this.status === 'PENDING') {
      return 'Convite recebido';
    }
    return 'Recusado';
  }

  async close(): Promise<void> {
    await this.modalController.dismiss();
  }

  async acceptInvite(): Promise<void> {
    if (!this.inviteId) return;

    this.postService.acceptInvite(this.inviteId).subscribe({
      next: (res) => {
        this.status = 'ACCEPTED';
        this.threadId = res.chatThreadId!;
        this.loadMessages();

        this.toastController.create({
          message: 'Convite aceito. Chat liberado.',
          duration: 1800,
          color: 'success',
          position: 'top'
        }).then(t => t.present());
      },
      error: (err) => console.error('Error accepting', err)
    });
  }

  sendMessage(): void {
    const text = this.draftMessage.trim();
    if (!text || this.status !== 'ACCEPTED') return;

    this.chatService.sendMessage(this.threadId, text).subscribe({
      next: (newMsg) => {
        this.messages.push(newMsg);
        this.draftMessage = '';
        this.shouldScrollToBottom = true;
      },
      error: (err) => console.error('Error sending', err)
    });
  }
}
