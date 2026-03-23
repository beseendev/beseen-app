import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { closeOutline, personCircleOutline } from 'ionicons/icons';
import { ChatThreadState } from '../../../models/chat.models';
import { ChatUiService } from '../../../services/chat-ui.service';
import { ChatSheetComponent } from '../chat-sheet/chat-sheet.component';

@Component({
  selector: 'app-scout-chat-inbox',
  templateUrl: './scout-chat-inbox.component.html',
  styleUrls: ['./scout-chat-inbox.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ScoutChatInboxComponent implements OnInit, OnDestroy {
  threads: ChatThreadState[] = [];

  private readonly modalController = inject(ModalController);
  private readonly chatUiService = inject(ChatUiService);
  private threadsSubscription?: Subscription;

  constructor() {
    addIcons({
      closeOutline,
      personCircleOutline
    });
  }

  ngOnInit(): void {
    this.threadsSubscription = this.chatUiService.threads$.subscribe((threadsMap) => {
      this.threads = Object.values(threadsMap);
    });
  }

  ngOnDestroy(): void {
    this.threadsSubscription?.unsubscribe();
  }

  async close(): Promise<void> {
    await this.modalController.dismiss();
  }

  async openThread(thread: ChatThreadState): Promise<void> {
    const modal = await this.modalController.create({
      component: ChatSheetComponent,
      componentProps: {
        athleteId: thread.athleteId,
        athleteName: thread.athleteName,
        athleteAvatarUrl: thread.athleteAvatarUrl ?? null
      },
      breakpoints: [0, 0.35, 0.7, 0.95],
      initialBreakpoint: 0.7,
      backdropBreakpoint: 0.35,
      handle: true,
      canDismiss: true
    });

    await modal.present();
  }

  trackByThread(_: number, thread: ChatThreadState): string {
    return thread.athleteId;
  }
}
