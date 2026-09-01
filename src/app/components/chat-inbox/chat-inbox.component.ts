import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { Subscription, Observable } from 'rxjs';
import { addIcons } from 'ionicons';
import { closeOutline, personCircleOutline } from 'ionicons/icons';
import { ChatThreadSummaryDTO } from '../../models/chat.models';
import { ChatService } from '../../services/chat.service';
import { ChatSheetComponent } from '../chat-sheet/chat-sheet.component';
import { Profile } from '../../models/profile.model';
import { PlayerCardComponent } from '../player-card/player-card.component';

@Component({
  selector: 'app-chat-inbox',
  templateUrl: './chat-inbox.component.html',
  styleUrls: ['./chat-inbox.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, PlayerCardComponent]
})
export class ChatInboxComponent implements OnInit {
  @Input() isPlayer = false;
  @Input() autoOpenThreadId?: number;

  threads: ChatThreadSummaryDTO[] = [];
  isLoading = false;
  hasMore = true;
  private autoOpenHandled = false;
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

        this.tryAutoOpenThread();
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

  private tryAutoOpenThread(): void {
    if (this.autoOpenHandled || !this.autoOpenThreadId) {
      return;
    }

    const thread = this.threads.find(t => t.chatThreadId === this.autoOpenThreadId);
    if (thread) {
      this.autoOpenHandled = true;
      this.openThread(thread);
    } else if (!this.hasMore) {
      this.autoOpenHandled = true;
    } else {
      this.loadThreads();
    }
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
        counterpartRole: thread.counterpartRole ?? null,
        counterpartBlocked: thread.counterpartBlocked ?? false,
        counterpartAta: thread.counterpartAta ?? null,
        counterpartDef: thread.counterpartDef ?? null,
        counterpartHab: thread.counterpartHab ?? null,
        counterpartForca: thread.counterpartForca ?? null,
        counterpartPositions: thread.counterpartPositions ?? null,
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

    const { data } = await modal.onDidDismiss();
    this.chatService.refreshThreadsUnreadCount().subscribe();
    if (data?.action === 'viewProfile') {
      await this.modalController.dismiss(data);
    }
  }

  trackByThread(_: number, thread: ChatThreadSummaryDTO): string {
    return String(thread.inviteId);
  }

  /** Usa a role real do contato (retornada pela API) e só cai para `isPlayer` quando ela não está disponível. */
  isCounterpartPlayer(thread: ChatThreadSummaryDTO): boolean {
    if (thread.counterpartRole) {
      return thread.counterpartRole === 'JOGADOR';
    }
    return !this.isPlayer;
  }

  toPlayerCardProfile(thread: ChatThreadSummaryDTO): Partial<Profile> {
    return {
      name: thread.counterpartName,
      urlProfileImage: thread.counterpartAvatar,
      ata: thread.counterpartAta ?? undefined,
      def: thread.counterpartDef ?? undefined,
      hab: thread.counterpartHab ?? undefined,
      forca: thread.counterpartForca ?? undefined,
      positions: thread.counterpartPositions ?? undefined
    };
  }
}
