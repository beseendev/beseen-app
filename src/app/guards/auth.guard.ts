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
      const userIdFromToken = decodedToken?.userId;

      if (state.url.includes('/create-post') && userRole === 'CLUBE') {
        return router.createUrlTree(['/home']);
      }

      // Protection for /profile and /profile/:userId
      if (state.url.includes('/profile')) {
        const routeUserId = route.paramMap.get('userId');
        const accessingOwnProfile = !routeUserId || (routeUserId === userIdFromToken);

        if (accessingOwnProfile && userRole === 'CLUBE') {
          return router.createUrlTree(['/home']);
        }
      }

      return true;
    })
  );
};

