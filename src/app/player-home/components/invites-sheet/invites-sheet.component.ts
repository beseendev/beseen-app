import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonList,
  IonSpinner,
  ModalController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, personCircleOutline, mailOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { PostService } from '../../../services/post.service';
import { PostInviteResponse } from '../../../models/player-chat.models';
import { ChatSheetComponent } from '../../../components/chat-sheet/chat-sheet.component';

@Component({
  selector: 'app-invites-sheet',
  templateUrl: './invites-sheet.component.html',
  styleUrls: ['./invites-sheet.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSpinner
  ]
})
export class InvitesSheetComponent implements OnInit {
  @Input() postId?: string;
  invites: PostInviteResponse[] = [];
  nextCursor: string | null = null;
  isLoading = false;
  hasMore = true;

  private readonly modalController = inject(ModalController);
  private readonly postService = inject(PostService);
  private readonly toastController = inject(ToastController);

  constructor() {
    addIcons({
      closeOutline,
      personCircleOutline,
      mailOutline,
      checkmarkCircleOutline
    });
  }

  ngOnInit(): void {
    console.log('InvitesSheetComponent initialized with postId:', this.postId);
    this.loadInvites();
  }

  async loadInvites(event?: any): Promise<void> {
    if (this.isLoading || (!this.hasMore && event)) {
      if (event) event.target.complete();
      return;
    }

    this.isLoading = true;

    this.postService.getInvites(10, this.nextCursor || undefined, this.postId).subscribe({
      next: (response) => {
        this.invites = [...this.invites, ...response.items];
        this.nextCursor = response.nextCursor;
        this.hasMore = !!response.nextCursor;
        this.isLoading = false;

        if (event) {
          event.target.complete();
        }
      },
      error: (err) => {
        console.error('Error loading invites', err);
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

  getInviteMessage(invite: PostInviteResponse): string {
    return `O olheiro ${invite.scoutProfile.fullName} enviou um convite de interesse em um de seus vídeos!`;
  }

  async acceptAndOpenChat(invite: PostInviteResponse): Promise<void> {
    this.postService.acceptInvite(invite.id).subscribe({
      next: async (acceptedInvite) => {
        invite.status = 'ACCEPTED';
        invite.chatThreadId = acceptedInvite.chatThreadId;
      },
      error: (err) => {
        console.error('Error accepting invite', err);
      }
    });
  }

  async openChat(invite: PostInviteResponse): Promise<void> {
    if (invite.status !== 'ACCEPTED' || !invite.chatThreadId) {
      return;
    }

    const modal = await this.modalController.create({
      component: ChatSheetComponent,
      componentProps: {
        threadId: invite.chatThreadId,
        counterpartName: invite.scoutProfile.fullName,
        counterpartAvatarUrl: invite.scoutProfile.urlProfileImage,
        status: 'ACCEPTED',
        isPlayer: true
      },
      breakpoints: [0, 0.4, 1],
      initialBreakpoint: 1,
      backdropBreakpoint: 0.4,
      canDismiss: true,
      handle: true
    });

    await modal.present();
    this.modalController.dismiss();
  }

  onInviteClick(invite: PostInviteResponse): void {
    if (invite.status === 'ACCEPTED') {
      this.openChat(invite);
    }
  }
}
