import { Injectable, inject } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { PlansModalComponent } from '../components/plans-modal/plans-modal.component';

@Injectable({
  providedIn: 'root'
})
export class ModalStateService {
  private modalController = inject(ModalController);
  private currentModalPromise: Promise<boolean> | null = null;

  async openPlansModal(): Promise<boolean> {
    if (this.currentModalPromise) {
      return this.currentModalPromise;
    }
    
    this.currentModalPromise = this.createAndShowModal();
    return this.currentModalPromise;
  }

  private async createAndShowModal(): Promise<boolean> {
    try {
      const modal = await this.modalController.create({
        component: PlansModalComponent,
        backdropDismiss: false,
        keyboardClose: false
      });
      await modal.present();
      const { data } = await modal.onDidDismiss();
      return !!data;
    } catch (error) {
      console.error('Erro ao abrir modal de planos:', error);
      return false;
    } finally {
      this.currentModalPromise = null;
    }
  }
}
