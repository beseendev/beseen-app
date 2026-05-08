import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, JwtPayload } from '../services/auth.service';
import { SubscriptionService } from '../services/subscription.service';
import { map, take, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const subscriptionGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const subscriptionService = inject(SubscriptionService);
  const router = inject(Router);

  const decodedToken = authService.getDecodedToken<JwtPayload>();
  const isClube = decodedToken?.role === 'CLUBE';

  if (!isClube) {
    return of(true);
  }

  // Se for clube, precisamos verificar a assinatura
  if (subscriptionService.hasActiveSubscription()) {
    return of(true);
  }

  // Tenta buscar do backend se não houver no localStorage
  return subscriptionService.getMySubscription().pipe(
    map(sub => {
      const active = sub && sub.status === 'ACTIVE';
      if (active) return true;
      
      // Permitimos o acesso para que o AppComponent possa exibir a modal de planos
      // que bloqueia a interface mas mantém o usuário na página atual.
      console.warn('Usuário CLUBE sem assinatura ativa. O bloqueio será feito via modal global.');
      return true;
    }),
    catchError(() => {
      // Em caso de erro, também permitimos para que o AppComponent tente gerenciar
      return of(true);
    })
  );
};
