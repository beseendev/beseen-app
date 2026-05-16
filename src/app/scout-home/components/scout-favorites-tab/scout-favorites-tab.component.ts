import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { heart, heartOutline, locationOutline, starOutline } from 'ionicons/icons';
import { ChatStatus, FavoriteAthleteVideoCard } from '../../../models/chat.models';
import { ChatService } from '../../../services/chat.service';
import { ScoutFeedItem } from '../../scout-home.page';
import { AdCardComponent } from '../../../components/ad-card/ad-card.component';
import { SubscriptionService } from "../../../services/subscription.service";

@Component({
  selector: 'app-scout-favorites-tab',
  templateUrl: './scout-favorites-tab.component.html',
  styleUrls: ['./scout-favorites-tab.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, AdCardComponent]
})
export class ScoutFavoritesTabComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() items: ScoutFeedItem[] = [];
  @Output() favoriteToggled = new EventEmitter<FavoriteAthleteVideoCard>();
  @Output() inviteRequested = new EventEmitter<FavoriteAthleteVideoCard>();
  @Output() chatRequested = new EventEmitter<FavoriteAthleteVideoCard>();

  @ViewChildren('vFav') videoElements!: QueryList<ElementRef<HTMLVideoElement>>;
  private videoObserver?: IntersectionObserver;

  private readonly chatService = inject(ChatService);
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  public readonly subscriptionService: SubscriptionService = inject(SubscriptionService);
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
      entries.forEach(entry => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          video.play().catch(e => console.log('Autoplay blocked:', e));
        } else {
          video.pause();
        }
      });
    }, {
      threshold: 0.6
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

  toggleFullScreen(video: HTMLVideoElement) {
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if ((video as any).webkitEnterFullscreen) {
      (video as any).webkitEnterFullscreen();
    }
  }

  trackByCard(_: number, item: ScoutFeedItem): string {
    return item.type === 'video' ? item.video.postId : `ad-${item.ad.id}`;
  }
}
