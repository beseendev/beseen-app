import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService, JwtPayload } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated().pipe(
    take(1),
    map(isAuthenticated => {
      if (!isAuthenticated) {
        return router.createUrlTree(['/login']);
      }

      const decodedToken = authService.getDecodedToken<JwtPayload>();
      const userRole = decodedToken?.role;

      if (state.url.startsWith('/create-post') && userRole === 'CLUBE') {
        return router.createUrlTree(['/scout-home']);
      }

      return true;
    })
  );
};
