import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, closeOutline, personCircleOutline, sendOutline } from 'ionicons/icons';
import { ChatMessageResponse, InviteStatus } from '../../../models/player-chat.models';
import { ChatService } from '../../../services/chat.service';

@Component({
  selector: 'app-chat-sheet',
  templateUrl: './chat-sheet.component.html',
  styleUrls: ['./chat-sheet.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ChatSheetComponent implements OnInit, AfterViewChecked {
  @Input({ required: true }) threadId?: number | null;
  @Input({ required: true }) athleteName!: string;
  @Input() athleteAvatarUrl?: string | null;
  @Input() status: InviteStatus = 'PENDING';

  @ViewChild('messagesViewport') messagesViewport?: ElementRef<HTMLDivElement>;

  messages: ChatMessageResponse[] = [];
  draftMessage = '';
  isLoading = false;
  private shouldScrollToBottom = false;

  private readonly chatService = inject(ChatService);
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);

  constructor() {
    addIcons({
      checkmarkCircleOutline,
      closeOutline,
      personCircleOutline,
      sendOutline
    });
  }

  ngOnInit(): void {
    if (this.threadId && this.status === 'ACCEPTED') {
      this.loadMessages();
    }
    this.shouldScrollToBottom = true;
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
    if (!this.threadId) return;

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
    return this.status === 'ACCEPTED' ? 'Liberado' : 'Aguardando Atleta';
  }

  async close(): Promise<void> {
    await this.modalController.dismiss();
  }

  sendMessage(): void {
    if (this.status !== 'ACCEPTED' || !this.threadId) {
      return;
    }

    const text = this.draftMessage.trim();
    if (!text) return;

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
