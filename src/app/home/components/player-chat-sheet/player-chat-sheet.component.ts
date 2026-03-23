import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, Input, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, closeOutline, personCircleOutline, sendOutline } from 'ionicons/icons';
import { PlayerChatThreadState } from '../../../models/player-chat.models';
import { PlayerChatUiService } from '../../../services/player-chat-ui.service';

@Component({
  selector: 'app-player-chat-sheet',
  templateUrl: './player-chat-sheet.component.html',
  styleUrls: ['./player-chat-sheet.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class PlayerChatSheetComponent implements OnInit, AfterViewChecked {
  @Input({ required: true }) scoutId!: string;
  @Input({ required: true }) scoutName!: string;
  @Input() scoutAvatarUrl?: string | null;

  @ViewChild('messagesViewport') messagesViewport?: ElementRef<HTMLDivElement>;

  thread!: PlayerChatThreadState;
  draftMessage = '';
  private shouldScrollToBottom = false;

  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly playerChatUiService = inject(PlayerChatUiService);

  constructor() {
    addIcons({
      checkmarkCircleOutline,
      closeOutline,
      personCircleOutline,
      sendOutline
    });
  }

  ngOnInit(): void {
    this.thread = this.playerChatUiService.getThread(this.scoutId, this.scoutName, this.scoutAvatarUrl);
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

  get statusLabel(): string {
    if (this.thread.status === 'LIBERADO') {
      return 'Chat liberado';
    }

    if (this.thread.status === 'CONVITE_RECEBIDO') {
      return 'Convite recebido';
    }

    return 'Sem convite';
  }

  async close(): Promise<void> {
    await this.modalController.dismiss(this.thread);
  }

  async acceptInvite(): Promise<void> {
    this.thread = this.playerChatUiService.acceptInvite(this.scoutId, this.scoutName, this.scoutAvatarUrl);
    this.shouldScrollToBottom = true;

    const toast = await this.toastController.create({
      message: 'Convite aceito. Chat liberado.',
      duration: 1800,
      color: 'success',
      position: 'top'
    });

    await toast.present();
  }

  sendMessage(): void {
    this.thread = this.playerChatUiService.sendMessage(
      this.scoutId,
      this.scoutName,
      this.draftMessage,
      this.scoutAvatarUrl
    );
    this.draftMessage = '';
    this.shouldScrollToBottom = true;
  }
}
