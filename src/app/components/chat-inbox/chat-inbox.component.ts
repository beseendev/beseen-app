import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { Subscription, Observable } from 'rxjs';
import { addIcons } from 'ionicons';
import { closeOutline, personCircleOutline } from 'ionicons/icons';
import { ChatThreadSummaryDTO } from '../../models/chat.models';
import { ChatService } from '../../services/chat.service';
import { ChatSheetComponent } from '../chat-sheet/chat-sheet.component';

@Component({
  selector: 'app-chat-inbox',
  templateUrl: './chat-inbox.component.html',
  styleUrls: ['./chat-inbox.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ChatInboxComponent implements OnInit, OnDestroy {
  @Input() isPlayer = false;

  threads: ChatThreadSummaryDTO[] = [];
  isLoading$: Observable<boolean>;

  private readonly modalController = inject(ModalController);
  private readonly chatService = inject(ChatService);
  private threadsSubscription?: Subscription;

  constructor() {
    this.isLoading$ = this.chatService.isLoading$;
    addIcons({
      closeOutline,
      personCircleOutline
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
      component: ChatSheetComponent,
      componentProps: {
        threadId: thread.chatThreadId,
        inviteId: thread.inviteId,
        counterpartName: thread.counterpartName,
        counterpartAvatarUrl: thread.counterpartAvatar,
        status: thread.status,
        isPlayer: this.isPlayer
      },
      breakpoints: [0, 0.4, 1],
      initialBreakpoint: 1,
      backdropBreakpoint: 0.4,
      handle: true,
      canDismiss: true
    });

    await modal.present();
  }

  trackByThread(_: number, thread: ChatThreadSummaryDTO): string {
    return String(thread.inviteId);
  }
}
