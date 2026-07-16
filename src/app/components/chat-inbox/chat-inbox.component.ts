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
export class ChatInboxComponent implements OnInit {
  @Input() isPlayer = false;

  threads: ChatThreadSummaryDTO[] = [];
  isLoading = false;
  hasMore = true;
  private readonly LIMIT = 10;

  private readonly modalController = inject(ModalController);
  private readonly chatService = inject(ChatService);

  constructor() {
    addIcons({
      closeOutline,
      personCircleOutline
    });
  }

  ngOnInit(): void {
    this.loadThreads();
  }

  async loadThreads(event?: any): Promise<void> {
    if (this.isLoading || (!this.hasMore && event)) {
      if (event) event.target.complete();
      return;
    }

    this.isLoading = true;
    const page = Math.floor(this.threads.length / this.LIMIT);

    this.chatService.loadThreads(this.LIMIT, page).subscribe({
      next: (response) => {
        this.threads = [...this.threads, ...response.items];
        this.hasMore = this.threads.length < response.totalElements;
        this.isLoading = false;

        if (event) {
          event.target.complete();
        }
      },
      error: (err) => {
        console.error('Error loading threads', err);
        this.isLoading = false;
        if (event) {
          event.target.complete();
        }
      }
    });
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
        counterpartProfileId: thread.counterpartProfileId ?? null,
        counterpartBlocked: thread.counterpartBlocked ?? false,
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
