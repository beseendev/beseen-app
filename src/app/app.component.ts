import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { AuthService, JwtPayload, User } from './services/auth.service';
import { SubscriptionService } from './services/subscription.service';
import { PlansModalComponent } from './components/plans-modal/plans-modal.component';
import {
  logOutOutline,
  personCircleOutline,
  settingsOutline,
  homeOutline,
  arrowBackOutline,
  menuOutline,
  closeOutline,
  eyeOutline,
  eyeOffOutline,
  mailOutline,
  lockClosedOutline,
  personOutline,
  logoGoogle,
  logoFacebook,
  logoTwitter, shieldCheckmarkOutline, resizeOutline, listOutline, barbellOutline, idCardOutline, documentTextOutline,
  callOutline, linkOutline, briefcaseOutline, businessOutline, logoWhatsapp, footballOutline, locationOutline,
  peopleOutline, mapOutline, ellipsisHorizontalOutline, searchOutline, globeOutline, starOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  private authService = inject(AuthService);
  private subscriptionService = inject(SubscriptionService);
  private modalCtrl = inject(ModalController);
  private router = inject(Router);

  private modalVisible = false;

  constructor() {
    addIcons({
      logOutOutline,
      personCircleOutline,
      settingsOutline,
      homeOutline,
      arrowBackOutline,
      menuOutline,
      closeOutline,
      eyeOutline,
      eyeOffOutline,
      mailOutline,
      lockClosedOutline,
      personOutline,
      logoGoogle,
      logoFacebook,
      logoTwitter,
      shieldCheckmarkOutline,
      resizeOutline,
      barbellOutline,
      listOutline,
      documentTextOutline,
      idCardOutline,
      callOutline,
      linkOutline,
      briefcaseOutline,
      businessOutline,
      logoWhatsapp,
      locationOutline,
      footballOutline,
      peopleOutline,
      mapOutline,
      ellipsisHorizontalOutline,
      globeOutline,
      searchOutline,
      starOutline
    });
  }

  ngOnInit() {
    this.authService.currentUser.subscribe(user => {
      if (user && user.hasProfile) {
        this.checkSubscription(user);
      }
    });
  }

  private async checkSubscription(user: User) {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    const isClube = decodedToken?.role === 'CLUBE' || user.scoutType != null;

    if (isClube && user.hasProfile && !this.subscriptionService.hasActiveSubscription()) {
      const endDateStr = decodedToken?.subscriptionEndDate;
      const status = decodedToken?.subscriptionStatus;

      if (status === 'ACTIVE' && endDateStr && new Date(endDateStr) < new Date()) {
        this.subscriptionService.expireExpired().subscribe({
          next: () => this.showPlansModal(),
          error: () => this.showPlansModal()
        });
      } else {
        this.showPlansModal();
      }
    }
  }

  private async showPlansModal() {
    if (this.modalVisible) return;

    this.modalVisible = true;
    const modal = await this.modalCtrl.create({
      component: PlansModalComponent,
      backdropDismiss: false,
      keyboardClose: false
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    this.modalVisible = false;

    if (!data && !this.subscriptionService.hasActiveSubscription()) {
      this.authService.logout();
    }
  }
}
