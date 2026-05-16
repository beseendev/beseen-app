import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, JwtPayload } from '../services/auth.service';
import { SubscriptionService } from '../services/subscription.service';
import { map } from 'rxjs/operators';
import { of, from } from 'rxjs';
import { ToastController } from '@ionic/angular/standalone';
import { SubscriptionStatus } from '../models/subscription.model';
import { ModalStateService } from '../services/modal-state.service';

export const subscriptionGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const subscriptionService = inject(SubscriptionService);
  const modalService = inject(ModalStateService);
  const router = inject(Router);
  const toastController = inject(ToastController);

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

    return from(modalService.openPlansModal()).pipe(
      map(purchased => {
        if (purchased) {
          const role = authService.getDecodedToken<JwtPayload>()?.role;
          if (role === 'CLUBE') router.navigate(['/scout-home']);
          else if (role === 'JOGADOR') router.navigate(['/player-home']);
          return true;
        }
        return false;
      })
    );
  }

  if (!subscriptionService.hasActiveSubscription()) {
     return from(modalService.openPlansModal()).pipe(
       map(purchased => {
         if (purchased) return true;
         return false;
       })
     );
  }

  const planName = subscriptionService.getPlanName();
  const url = state.url;
  if (planName === 'Visualização' && url.includes('/profile-player')) {
    toastController.create({
      message: 'Seu plano Visualização não permite ver perfis. Faça upgrade!',
      duration: 3000,
      color: 'warning',
      position: 'bottom'
    }).then(t => t.present());
    return of(false);
  }

  return of(true);
};
