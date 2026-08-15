import { Component, ElementRef, Input, OnInit, ViewChild, inject } from '@angular/core';
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
export class BannerCarouselComponent implements OnInit {
  @Input() title = 'Nossas fundadoras';

  @ViewChild('track') trackRef?: ElementRef<HTMLDivElement>;

  private readonly adService = inject(AdvertisementService);

  banners: Advertisement[] = [];
  isLoading = true;
  activeIndex = 0;

  constructor() {
    addIcons({ openOutline });
  }

  ngOnInit(): void {
    this.adService.getActiveBanners().subscribe({
      next: (banners) => {
        this.banners = banners || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading banners', err);
        this.banners = [];
        this.isLoading = false;
      }
    });
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
}
