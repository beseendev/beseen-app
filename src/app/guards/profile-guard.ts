import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService, JwtPayload, User } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const profileGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser.pipe(
    take(1),
    map((user: User | null) => {
      if (user && user.hasProfile) {
        return true;
      } else if (user && !user.hasProfile) {
        const decodedToken = authService.getDecodedToken<JwtPayload>();
        const profileSetupRoute = decodedToken?.role === 'CLUBE' ? '/scout-profile' : '/create-profile';
        return router.createUrlTree([profileSetupRoute]);
      }
      return router.createUrlTree(['/login']);
    })
  );
};
