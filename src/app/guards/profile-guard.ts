import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService, JwtPayload, User } from '../services/auth.service';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { of } from 'rxjs';

export const profileGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser.pipe(
    take(1),
    map((user: User | null) => {
      if (!user) return true;
      if (user.hasProfile) return true;

      const decodedToken = authService.getDecodedToken<JwtPayload>();
      const role = decodedToken?.role;

      if (role === 'CLUBE') {
        return router.createUrlTree(['/create-profile-scout']);
      } else if (role === 'JOGADOR') {
        return router.createUrlTree(['/create-profile-player']);
      } else {
        return router.createUrlTree(['/profile-selection']);
      }
    })
  );
};
