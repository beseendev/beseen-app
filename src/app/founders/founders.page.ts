import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon, IonContent, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, openOutline, ribbonOutline } from 'ionicons/icons';
import { Router } from '@angular/router';
import { AdvertisementService } from '../services/advertisement.service';
import { Advertisement } from '../models/advertisement.model';
import { AuthService, JwtPayload } from '../services/auth.service';

@Component({
  selector: 'app-founders',
  templateUrl: './founders.page.html',
  styleUrls: ['./founders.page.scss'],
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon, IonContent, IonSpinner],
})
export class FoundersPage implements OnInit, OnDestroy {
  banners: Advertisement[] = [];
  isLoading = true;
  /** Id do card com o efeito de "toque" ativo no momento (ver onCardTap). */
  pressedBannerId: number | null = null;

  private adService = inject(AdvertisementService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private pressTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    addIcons({ arrowBackOutline, openOutline, ribbonOutline });
  }

  ngOnInit(): void {
    this.adService.getActiveBanners().subscribe({
      next: (banners) => {
        this.banners = banners || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading founders', err);
        this.banners = [];
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.pressTimeout);
  }

  /** Dispara o brilho/realce ao tocar no card (equivalente ao :hover em telas sem mouse) e abre o site da empresa. */
  onCardTap(banner: Advertisement): void {
    this.pressedBannerId = banner.id;
    clearTimeout(this.pressTimeout);
    this.pressTimeout = setTimeout(() => {
      this.pressedBannerId = null;
    }, 650);

    this.goToSite(banner);
  }

  goToSite(banner: Advertisement): void {
    if (banner.siteLink) {
      window.open(banner.siteLink, '_blank');
    }
  }

  trackByBanner(_: number, banner: Advertisement): number {
    return banner.id;
  }

  getInitial(companyName: string): string {
    return companyName?.trim().charAt(0).toUpperCase() || '?';
  }

  goBack(): void {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    const isClube = decodedToken?.role === 'CLUBE';

    isClube ? this.router.navigateByUrl('/scout-home') : this.router.navigateByUrl('/player-home');
  }
}
