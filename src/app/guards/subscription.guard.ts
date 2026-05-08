import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, JwtPayload } from '../services/auth.service';
import { SubscriptionService } from '../services/subscription.service';
import { map, take, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ModalController } from '@ionic/angular/standalone';
import { SubscriptionStatus } from '../models/subscription.model';
import { PlansModalComponent } from '../components/plans-modal/plans-modal.component';

let isModalOpen = false;

async function openPlansModal(modalController: ModalController) {
  if (isModalOpen) return;
  isModalOpen = true;
  const modal = await modalController.create({
    component: PlansModalComponent,
    backdropDismiss: false
  });
  await modal.present();
  await modal.onDidDismiss();
  isModalOpen = false;
}

export const subscriptionGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const subscriptionService = inject(SubscriptionService);
  const modalController = inject(ModalController);
  const router = inject(Router);

  const decodedToken = authService.getDecodedToken<JwtPayload>();
  const isClube = decodedToken?.role === 'CLUBE';

  if (!isClube) {
    return of(true);
  }

  const isStatusActive = decodedToken.subscriptionStatus === SubscriptionStatus.ACTIVE;
  const isDateExpired = decodedToken.subscriptionEndDate
    ? new Date(decodedToken.subscriptionEndDate) < new Date()
    : false;

  if (!isStatusActive || isDateExpired) {
    if (isDateExpired) {
      subscriptionService.expireExpired().subscribe();
    }
    openPlansModal(modalController);
    return of(true);
  }

  if (subscriptionService.hasActiveSubscription()) {
    return of(true);
  }

  return subscriptionService.getMySubscription().pipe(
    map(sub => {
      const active = sub && sub.status === 'ACTIVE';
      if (active) return true;

      console.warn('Usuário CLUBE sem assinatura ativa. O bloqueio será feito via modal global.');
      openPlansModal(modalController);
      return true;
    }),
    catchError(() => {
      return of(true);
    })
  );
};
