import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { chatbubbleEllipsesOutline, closeOutline, personCircleOutline } from 'ionicons/icons';
import { PlayerChatThreadState } from '../../../models/player-chat.models';
import { PlayerChatUiService } from '../../../services/player-chat-ui.service';
import { PlayerChatSheetComponent } from '../player-chat-sheet/player-chat-sheet.component';

@Component({
  selector: 'app-player-chat-inbox',
  templateUrl: './player-chat-inbox.component.html',
  styleUrls: ['./player-chat-inbox.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class PlayerChatInboxComponent implements OnInit, OnDestroy {
  threads: PlayerChatThreadState[] = [];

  private readonly modalController = inject(ModalController);
  private readonly playerChatUiService = inject(PlayerChatUiService);
  private threadsSubscription?: Subscription;

  constructor() {
    addIcons({
      chatbubbleEllipsesOutline,
      closeOutline,
      personCircleOutline
    });
  }

  ngOnInit(): void {
    this.threadsSubscription = this.playerChatUiService.threads$.subscribe((threadsMap) => {
      this.threads = Object.values(threadsMap).filter(
        (thread) => thread.status !== 'SEM_CONVITE' || thread.messages.length > 0
      );
    });
  }

  ngOnDestroy(): void {
    this.threadsSubscription?.unsubscribe();
  }

  async close(): Promise<void> {
    await this.modalController.dismiss();
  }

  async openThread(thread: PlayerChatThreadState): Promise<void> {
    const modal = await this.modalController.create({
      component: PlayerChatSheetComponent,
      componentProps: {
        scoutId: thread.scoutId,
        scoutName: thread.scoutName,
        scoutAvatarUrl: thread.scoutAvatarUrl ?? null
      },
      breakpoints: [0, 0.35, 0.7, 0.95],
      initialBreakpoint: 0.7,
      backdropBreakpoint: 0.35,
      handle: true,
      canDismiss: true
    });

    await modal.present();
  }

  trackByThread(_: number, thread: PlayerChatThreadState): string {
    return thread.scoutId;
  }
}
