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
import { ChatMessage, ChatStatus, ChatThreadState } from '../../../models/chat.models';
import { ChatUiService } from '../../../services/chat-ui.service';

@Component({
  selector: 'app-chat-sheet',
  templateUrl: './chat-sheet.component.html',
  styleUrls: ['./chat-sheet.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ChatSheetComponent implements OnInit, AfterViewChecked {
  @Input({ required: true }) athleteId!: string;
  @Input({ required: true }) athleteName!: string;
  @Input() athleteAvatarUrl?: string | null;

  @ViewChild('messagesViewport') messagesViewport?: ElementRef<HTMLDivElement>;

  thread!: ChatThreadState;
  draftMessage = '';
  private shouldScrollToBottom = false;

  private readonly chatUiService = inject(ChatUiService);
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
    this.thread = this.chatUiService.getThread(this.athleteId, this.athleteName, this.athleteAvatarUrl);
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

  get status(): ChatStatus {
    return this.thread.status;
  }

  get messages(): ChatMessage[] {
    return this.thread.messages;
  }

  get statusLabel(): string {
    return this.status === 'LIBERADO' ? 'Liberado' : 'Aguardando';
  }

  async close(): Promise<void> {
    await this.modalController.dismiss();
  }

  async simulateAccept(): Promise<void> {
    this.thread = this.chatUiService.forceAcceptForDemo(this.athleteId, this.athleteName, this.athleteAvatarUrl);
    this.shouldScrollToBottom = true;

    const toast = await this.toastController.create({
      message: `${this.athleteName} aceitou. Chat liberado.`,
      duration: 1800,
      color: 'success',
      position: 'top'
    });

    await toast.present();
  }

  sendMessage(): void {
    if (this.status !== 'LIBERADO') {
      return;
    }

    const nextThread = this.chatUiService.sendMessage(
      this.athleteId,
      this.athleteName,
      this.draftMessage,
      this.athleteAvatarUrl
    );

    this.thread = nextThread;
    this.draftMessage = '';
    this.shouldScrollToBottom = true;
  }
}
