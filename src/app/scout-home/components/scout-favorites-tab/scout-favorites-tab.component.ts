import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { heart, heartOutline, locationOutline, starOutline } from 'ionicons/icons';
import { ChatStatus, FavoriteAthleteVideoCard } from '../../../models/chat.models';
import { ChatUiService } from '../../../services/chat-ui.service';
import { ChatSheetComponent } from '../chat-sheet/chat-sheet.component';

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

  private readonly chatUiService = inject(ChatUiService);
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly router = inject(Router);
  private threadsSubscription?: Subscription;
  private threadsSnapshot: Record<string, { status: ChatStatus }> = {};

  constructor() {
    addIcons({
      heart,
      heartOutline,
      locationOutline,
      starOutline
    });
  }

  ngOnInit(): void {
    this.threadsSubscription = this.chatUiService.threads$.subscribe(threads => {
      this.threadsSnapshot = threads;
    });
  }

  ngOnDestroy(): void {
    this.threadsSubscription?.unsubscribe();
  }

  getStatus(card: FavoriteAthleteVideoCard): ChatStatus {
    return this.threadsSnapshot[card.athleteId]?.status ?? 'BLOQUEADO';
  }

  async invite(card: FavoriteAthleteVideoCard): Promise<void> {
    this.chatUiService.sendInvite(card.athleteId, card.athleteName, card.athleteAvatarUrl);

    const toast = await this.toastController.create({
      message: 'Convite enviado ao atleta',
      duration: 1800,
      color: 'success',
      position: 'top'
    });

    await toast.present();
  }

  async openSheet(card: FavoriteAthleteVideoCard): Promise<void> {
    const modal = await this.modalController.create({
      component: ChatSheetComponent,
      componentProps: {
        athleteId: card.athleteId,
        athleteName: card.athleteName,
        athleteAvatarUrl: card.athleteAvatarUrl ?? null
      },
      breakpoints: [0, 0.35, 0.7, 0.95],
      initialBreakpoint: 0.7,
      backdropBreakpoint: 0.35,
      handle: true,
      canDismiss: true,
      cssClass: 'chat-sheet-modal'
    });

    await modal.present();
  }

  toggleFavorite(card: FavoriteAthleteVideoCard): void {
    this.favoriteToggled.emit(card);
  }

  openAthleteProfile(card: FavoriteAthleteVideoCard): void {
    this.router.navigate(['/profile', card.athleteId]);
  }

  trackByCard(_: number, card: FavoriteAthleteVideoCard): string {
    return card.postId;
  }
}
