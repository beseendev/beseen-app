import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { InAppReview } from '@capacitor-community/in-app-review';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReviewPromptService {
  private readonly alertController = inject(AlertController);
  private readonly router = inject(Router);

  private static readonly OPENS_KEY = 'review_open_count';
  private static readonly ACCEPTED_KEY = 'review_accepted';
  private static readonly LAST_ASK_KEY = 'review_last_ask';
  private static readonly MIN_OPENS = 2;
  private static readonly MIN_INTERVAL_MS = 90 * 24 * 60 * 60 * 1000;

  registerOpen(): void {
    const opens = this.getNumber(ReviewPromptService.OPENS_KEY) + 1;
    this.setNumber(ReviewPromptService.OPENS_KEY, opens);
  }

  async maybeAsk(): Promise<void> {
    if (!Capacitor.isNativePlatform() || !this.canAsk()) return;
    this.setNumber(ReviewPromptService.LAST_ASK_KEY, Date.now());

    const alert = await this.alertController.create({
      header: 'Está gostando do BeSeen?',
      message: 'Sua opinião nos ajuda a melhorar o app.',
      cssClass: 'be-alert-confirm',
      buttons: [
        { text: 'Não', handler: () => void this.router.navigate(['/suporte']) },
        {
          text: 'Sim',
          handler: () => {
            // Quem disse que está gostando nunca mais é incomodado.
            this.setNumber(ReviewPromptService.ACCEPTED_KEY, 1);
            void InAppReview.requestReview().catch(() => undefined);
          }
        }
      ]
    });
    await alert.present();
  }

  async openStoreReview(): Promise<void> {
    if (Capacitor.getPlatform() === 'ios') {
      window.open(`https://apps.apple.com/app/id${environment.iosAppStoreId}?action=write-review`, '_system');
    } else {
      const { id } = await CapacitorApp.getInfo();
      window.open(`market://details?id=${id}`, '_system');
    }
  }

  private canAsk(): boolean {
    if (this.getNumber(ReviewPromptService.ACCEPTED_KEY)) return false;
    const opens = this.getNumber(ReviewPromptService.OPENS_KEY);
    const last = this.getNumber(ReviewPromptService.LAST_ASK_KEY);
    return opens >= ReviewPromptService.MIN_OPENS && Date.now() - last >= ReviewPromptService.MIN_INTERVAL_MS;
  }

  private getNumber(key: string): number {
    try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; }
  }

  private setNumber(key: string, value: number): void {
    try { localStorage.setItem(key, String(value)); } catch { /* ignora */ }
  }
}
