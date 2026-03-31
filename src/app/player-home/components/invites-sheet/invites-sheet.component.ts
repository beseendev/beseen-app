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
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, personCircleOutline, mailOutline } from 'ionicons/icons';
import { PostService } from '../../../services/post.service';
import { PostInviteResponse } from '../../../models/player-chat.models';

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

  constructor() {
    addIcons({
      closeOutline,
      personCircleOutline,
      mailOutline
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
        this.invites = [...this.invites, ...response.invites];
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

  onInviteClick(invite: PostInviteResponse): void {
    // Optional: add logic here if clicking an invite should do something,
    // like opening the chat directly.
    this.modalController.dismiss({ invite });
  }
}
