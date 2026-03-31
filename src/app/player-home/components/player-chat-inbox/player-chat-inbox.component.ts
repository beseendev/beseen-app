import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { Subscription, Observable } from 'rxjs';
import { addIcons } from 'ionicons';
import { chatbubbleEllipsesOutline, closeOutline, personCircleOutline, searchOutline } from 'ionicons/icons';
import { ChatThreadSummaryDTO } from '../../../models/player-chat.models';
import { ChatService } from '../../../services/chat.service';
import { PlayerChatSheetComponent } from '../player-chat-sheet/player-chat-sheet.component';

@Component({
  selector: 'app-player-chat-inbox',
  templateUrl: './player-chat-inbox.component.html',
  styleUrls: ['./player-chat-inbox.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class PlayerChatInboxComponent implements OnInit, OnDestroy {
  threads: ChatThreadSummaryDTO[] = [];
  isLoading$: Observable<boolean>;

  private readonly modalController = inject(ModalController);
  private readonly chatService = inject(ChatService);
  private threadsSubscription?: Subscription;

  constructor() {
    this.isLoading$ = this.chatService.isLoading$;
    addIcons({
      chatbubbleEllipsesOutline,
      closeOutline,
      personCircleOutline,
      searchOutline
    });
  }

  ngOnInit(): void {
    this.threadsSubscription = this.chatService.threads$.subscribe((threads) => {
      this.threads = threads;
    });
    this.chatService.loadThreads().subscribe();
  }

  ngOnDestroy(): void {
    this.threadsSubscription?.unsubscribe();
  }

  async close(): Promise<void> {
    await this.modalController.dismiss();
  }

  async openThread(thread: ChatThreadSummaryDTO): Promise<void> {
    const modal = await this.modalController.create({
      component: PlayerChatSheetComponent,
      componentProps: {
        threadId: thread.chatThreadId,
        inviteId: thread.inviteId,
        scoutName: thread.counterpartName,
        scoutAvatarUrl: thread.counterpartAvatar,
        status: thread.status
      },
      breakpoints: [0, 0.35, 0.7, 0.95],
      initialBreakpoint: 0.7,
      backdropBreakpoint: 0.35,
      handle: true,
      canDismiss: true
    });

    await modal.present();
  }

  trackByThread(_: number, thread: ChatThreadSummaryDTO): string {
    return String(thread.inviteId);
  }
}
