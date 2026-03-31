import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { heart, heartOutline, locationOutline, starOutline } from 'ionicons/icons';
import { ChatStatus, FavoriteAthleteVideoCard } from '../../../models/chat.models';
import { ChatService } from '../../../services/chat.service';

@Component({
  selector: 'app-scout-favorites-tab',
  templateUrl: './scout-favorites-tab.component.html',
  styleUrls: ['./scout-favorites-tab.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ScoutFavoritesTabComponent implements OnInit, OnDestroy {
  @Input() cards: FavoriteAthleteVideoCard[] = [];
  @Output() favoriteToggled = new EventEmitter<FavoriteAthleteVideoCard>();
  @Output() inviteRequested = new EventEmitter<FavoriteAthleteVideoCard>();
  @Output() chatRequested = new EventEmitter<FavoriteAthleteVideoCard>();

  private readonly chatService = inject(ChatService);
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly router = inject(Router);

  constructor() {
    addIcons({
      heart,
      heartOutline,
      locationOutline,
      starOutline
    });
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
  }

  getStatus(card: FavoriteAthleteVideoCard): ChatStatus {
    return card.inviteStatus ?? 'PENDING';
  }

  async invite(card: FavoriteAthleteVideoCard): Promise<void> {
    this.inviteRequested.emit(card);
  }

  async openChat(card: FavoriteAthleteVideoCard): Promise<void> {
    this.chatRequested.emit(card);
  }

  toggleFavorite(card: FavoriteAthleteVideoCard): void {
    this.favoriteToggled.emit(card);
  }

  openAthleteProfile(card: FavoriteAthleteVideoCard): void {
    this.router.navigate(['/profile-player', card.athleteId]);
  }

  trackByCard(_: number, card: FavoriteAthleteVideoCard): string {
    return card.postId;
  }
}
