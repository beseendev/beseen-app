import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { locationOutline, star, starOutline, volumeHighOutline, volumeMuteOutline, flagOutline } from 'ionicons/icons';
import { ChatStatus, FavoriteAthleteVideoCard } from '../../../models/chat.models';
import { Profile } from '../../../models/profile.model';
import { ChatService } from '../../../services/chat.service';
import { ScoutFeedItem } from '../../scout-home.page';
import { AdCardComponent } from '../../../components/ad-card/ad-card.component';
import { PlayerCardComponent } from '../../../components/player-card/player-card.component';
import { SubscriptionService } from "../../../services/subscription.service";
import { ViewportVideoPlayerDirective } from '../../../shared/directives/viewport-video-player.directive';

@Component({
  selector: 'app-scout-favorites-tab',
  templateUrl: './scout-favorites-tab.component.html',
  styleUrls: ['./scout-favorites-tab.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, AdCardComponent, PlayerCardComponent, ViewportVideoPlayerDirective]
})
export class ScoutFavoritesTabComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() items: ScoutFeedItem[] = [];
  @Output() favoriteToggled = new EventEmitter<FavoriteAthleteVideoCard>();
  @Output() inviteRequested = new EventEmitter<FavoriteAthleteVideoCard>();
  @Output() chatRequested = new EventEmitter<FavoriteAthleteVideoCard>();
  @Output() reportRequested = new EventEmitter<FavoriteAthleteVideoCard>();

  @ViewChildren('vFav') videoElements!: QueryList<ElementRef<HTMLVideoElement>>;
  private videoObserver?: IntersectionObserver;

  private readonly chatService = inject(ChatService);
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  public readonly subscriptionService: SubscriptionService = inject(SubscriptionService);
  private readonly router = inject(Router);

  constructor() {
    addIcons({
      locationOutline,
      star,
      starOutline,
      volumeHighOutline,
      volumeMuteOutline,
      flagOutline
    });
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.setupVideoObserver();
    this.videoElements.changes.subscribe(() => {
      this.setupVideoObserver();
    });
  }

  private setupVideoObserver(): void {
    if (this.videoObserver) {
      this.videoObserver.disconnect();
    }

    this.videoObserver = new IntersectionObserver((entries) => {
      const activeEntry = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      this.videoElements.forEach(videoRef => {
        const video = videoRef.nativeElement;
        if (activeEntry?.target === video) {
          video.play().catch(e => console.log('Autoplay blocked:', e));
        } else {
          video.pause();
        }
      });
    }, {
      threshold: [0, 0.35, 0.65, 0.85]
    });

    this.videoElements.forEach(videoRef => {
      this.videoObserver?.observe(videoRef.nativeElement);
    });
  }

  ngOnDestroy(): void {
    if (this.videoObserver) {
      this.videoObserver.disconnect();
    }
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

  report(card: FavoriteAthleteVideoCard): void {
    this.reportRequested.emit(card);
  }

  openAthleteProfile(card: FavoriteAthleteVideoCard): void {
    if (!this.subscriptionService.canViewProfiles()) {
      this.toastController.create({
        message: 'Seu plano atual não permite visualizar perfis detalhados. Faça um upgrade!',
        duration: 3000,
        color: 'medium',
        position: 'bottom'
      }).then(t => t.present());
      return;
    }
    this.router.navigate(['/profile-player', card.athleteId]);
  }

  toPlayerCardProfile(card: FavoriteAthleteVideoCard): Partial<Profile> {
    return {
      name: card.athleteName,
      urlProfileImage: card.athleteAvatarUrl,
      positions: card.position ? [card.position] : undefined
    };
  }

  shouldShowConversationAction(card: FavoriteAthleteVideoCard): boolean {
    return card.inviteStatus === 'ACCEPTED' || this.subscriptionService.canSendInvites();
  }

  trackByCard(_: number, item: ScoutFeedItem): string {
    return item.type === 'video' ? item.video.postId : `ad-${item.ad.id}`;
  }
}
