import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, Input, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController, IonContent, ActionSheetController, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { banOutline, checkmarkCircleOutline, closeOutline, ellipsisHorizontal, personCircleOutline, sendOutline, shieldHalfOutline } from 'ionicons/icons';
import { ChatMessageResponse, InviteStatus } from '../../models/player-chat.models';
import { ChatService } from '../../services/chat.service';
import { PostService } from '../../services/post.service';
import { BlockService } from '../../services/block.service';

@Component({
  selector: 'app-chat-sheet',
  templateUrl: './chat-sheet.component.html',
  styleUrls: ['./chat-sheet.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ChatSheetComponent implements OnInit, AfterViewChecked {
  @Input() threadId?: number | null;
  @Input({ required: true }) counterpartName!: string;
  @Input() counterpartAvatarUrl?: string | null;
  @Input() counterpartProfileId?: string | number | null;
  @Input() counterpartBlocked = false;
  @Input() inviteId?: number;
  @Input() status: InviteStatus = 'PENDING';
  @Input() isPlayer = false;

  isBlocked = false;

  @ViewChild(IonContent, { static: false }) content?: IonContent;

  messages: ChatMessageResponse[] = [];
  draftMessage = '';
  isLoading = false;
  private shouldScrollToBottom = false;

  private readonly chatService = inject(ChatService);
  private readonly postService = inject(PostService);
  private readonly blockService = inject(BlockService);
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly alertController = inject(AlertController);

  constructor() {
    addIcons({
      banOutline,
      checkmarkCircleOutline,
      closeOutline,
      ellipsisHorizontal,
      personCircleOutline,
      sendOutline,
      shieldHalfOutline
    });
  }

  ngOnInit(): void {
    this.isBlocked = this.counterpartBlocked;
    if (this.threadId && this.status === 'ACCEPTED' && !this.isBlocked) {
      this.loadMessages();
    }
    this.shouldScrollToBottom = true;
  }

  get canBlock(): boolean {
    return !this.isBlocked;
  }

  /** Papel do outro participante: o jogador conversa com um olheiro e vice-versa. */
  get counterpartRoleLabel(): string {
    return this.isPlayer ? 'olheiro' : 'jogador';
  }

  async openChatOptions(): Promise<void> {
    const actionSheet = await this.actionSheetController.create({
      cssClass: 'be-action-sheet',
      buttons: [
        {
          text: 'Bloquear usuário',
          role: 'destructive',
          icon: banOutline,
          handler: () => {
            this.confirmBlock();
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel',
          icon: closeOutline
        }
      ]
    });
    await actionSheet.present();
  }

  async confirmBlock(): Promise<void> {
    const firstName = this.counterpartName?.split(' ')[0] || 'usuário';
    const alert = await this.alertController.create({
      header: `Bloquear ${firstName}?`,
      message: `Você não verá mais mensagens, convites ou interações deste ${this.counterpartRoleLabel}. Ele não será avisado sobre o bloqueio.`,
      cssClass: 'be-alert-confirm',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Bloquear',
          role: 'destructive',
          handler: () => {
            this.blockCounterpart();
          }
        }
      ]
    });
    await alert.present();
  }

  private blockCounterpart(): void {
    if (!this.counterpartProfileId) {
      this.toastController.create({
        message: 'Não foi possível identificar o usuário para bloqueio.',
        duration: 2200,
        color: 'danger',
        position: 'top'
      }).then(t => t.present());
      return;
    }

    this.blockService.blockUser(String(this.counterpartProfileId)).subscribe({
      next: () => {
        this.isBlocked = true;
        this.draftMessage = '';
      },
      error: (err) => console.error('Error blocking user', err)
    });
  }

  unblockCounterpart(): void {
    if (!this.counterpartProfileId) return;

    this.blockService.unblockUser(String(this.counterpartProfileId)).subscribe({
      next: () => {
        this.isBlocked = false;
        if (this.threadId && this.status === 'ACCEPTED') {
          this.loadMessages();
        }
      },
      error: (err) => console.error('Error unblocking user', err)
    });
  }

  ngAfterViewChecked(): void {
    if (!this.shouldScrollToBottom) return;
    this.scrollToBottom();
    this.shouldScrollToBottom = false;
  }

  private scrollToBottom(): void {
    if (this.content) {
      this.content.scrollToBottom(300);
    }
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
    if (this.status === 'ACCEPTED') return 'Liberado';
    return this.isPlayer ? 'Convite recebido' : 'Aguardando Atleta';
  }

  async close(): Promise<void> {
    await this.modalController.dismiss();
  }

  async acceptInvite(): Promise<void> {
    if (!this.inviteId) return;

    this.postService.acceptInvite(this.inviteId).subscribe({
      next: (res) => {
        this.status = 'ACCEPTED';
        this.threadId = res.chatThreadId;
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

  async rejectInvite(): Promise<void> {
    if (!this.inviteId) return;

    this.postService.rejectInvite(this.inviteId).subscribe({
      next: () => {
        this.toastController.create({
          message: 'Convite recusado.',
          duration: 1800,
          color: 'medium',
          position: 'top'
        }).then(t => t.present());
        this.close();
      },
      error: (err) => console.error('Error rejecting', err)
    });
  }

  sendMessage(): void {
    if (this.status !== 'ACCEPTED' || !this.threadId || this.isBlocked) return;

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
