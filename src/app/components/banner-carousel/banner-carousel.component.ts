import { Component, ElementRef, Input, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { openOutline } from 'ionicons/icons';
import { Advertisement } from '../../models/advertisement.model';
import { AdvertisementService } from '../../services/advertisement.service';

@Component({
  selector: 'app-banner-carousel',
  templateUrl: './banner-carousel.component.html',
  styleUrls: ['./banner-carousel.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class BannerCarouselComponent implements OnInit, OnDestroy {
  @Input() title = 'Nossas fundadoras';
  @Input() autoplay = true;
  @Input() autoplayIntervalMs = 4000;

  @ViewChild('track') trackRef?: ElementRef<HTMLDivElement>;

  private readonly adService = inject(AdvertisementService);
  private readonly zone = inject(NgZone);

  banners: Advertisement[] = [];
  isLoading = true;
  activeIndex = 0;

  private autoplayTimer?: ReturnType<typeof setInterval>;

  constructor() {
    addIcons({ openOutline });
  }

  ngOnInit(): void {
    this.adService.getActiveBanners().subscribe({
      next: (banners) => {
        this.banners = banners || [];
        this.isLoading = false;
        this.startAutoplay();
      },
      error: (err) => {
        console.error('Error loading banners', err);
        this.banners = [];
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  goToSite(banner: Advertisement): void {
    if (banner.siteLink) {
      window.open(banner.siteLink, '_blank');
    }
  }

  onTrackScroll(): void {
    const el = this.trackRef?.nativeElement;
    if (!el || el.children.length === 0) return;
    const cardWidth = (el.children[0] as HTMLElement).offsetWidth + 12;
    this.activeIndex = Math.min(
      this.banners.length - 1,
      Math.round(el.scrollLeft / cardWidth)
    );
  }

  trackByBanner(_: number, banner: Advertisement): number {
    return banner.id;
  }

  /** Roda fora da zone do Angular para o timer do autoplay não disparar detecção de mudanças a cada tick. */
  startAutoplay(): void {
    this.stopAutoplay();
    if (!this.autoplay || this.banners.length <= 1) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.autoplayTimer = setInterval(() => {
        this.zone.run(() => this.goToNextBanner());
      }, this.autoplayIntervalMs);
    });
  }

  stopAutoplay(): void {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = undefined;
    }
  }

  /** Pausa o autoplay enquanto o usuário arrasta o carrossel manualmente. */
  onUserInteractionStart(): void {
    this.stopAutoplay();
  }

  /** Retoma o autoplay (com o intervalo completo) depois que o usuário solta o gesto. */
  onUserInteractionEnd(): void {
    this.startAutoplay();
  }

  private goToNextBanner(): void {
    if (this.banners.length <= 1) {
      return;
    }

    const nextIndex = (this.activeIndex + 1) % this.banners.length;
    this.scrollToIndex(nextIndex);
  }

  private scrollToIndex(index: number): void {
    const el = this.trackRef?.nativeElement;
    if (!el || el.children.length === 0) return;

    const cardWidth = (el.children[0] as HTMLElement).offsetWidth + 12;
    el.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
    this.activeIndex = index;
  }
}
