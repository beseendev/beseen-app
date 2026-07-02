import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject, EMPTY } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService, JwtPayload } from '../services/auth.service';
import { ToastController } from '@ionic/angular/standalone';
import { environment } from '../../environments/environment';
import { SubscriptionService } from '../services/subscription.service';
import { jwtDecode } from 'jwt-decode';
import { SubscriptionStatus } from '../models/subscription.model';
import { ModalStateService } from '../services/modal-state.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  const toastController = inject(ToastController);
  const modalService = inject(ModalStateService);
  const subscriptionService = inject(SubscriptionService);
  const accessToken = authService.getAccessToken();

  if (accessToken && req.url.startsWith(environment.apiUrl) && !req.url.includes('/auth/refresh')) {
    if (authService.isTokenExpired(accessToken)) {
      return handleTokenRefresh(req, next, authService);
    }
    req = addToken(req, accessToken);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status === 401 &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/refresh')
      ) {
        return handleTokenRefresh(req, next, authService);
      }

      if (error.status === 0) {
        toastController.create({
          message: "Não foi possível se conectar ao servidor.",
          duration: 3000,
          color: 'danger'
        }).then(toast => toast.present());
        return EMPTY;
      }

      const errorMessage = error.error?.message || 'Ocorreu um erro. Tente novamente.';
      toastController.create({
        message: errorMessage,
        duration: 3000,
        color: 'danger'
      }).then(toast => toast.present());

      return throwError(() => error);
    })
  );
};

const addToken = (req: HttpRequest<any>, token: string) => {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
};

const handleTokenRefresh = (
  req: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService
): Observable<HttpEvent<any>> => {
  console.log('Interceptor: Iniciando ou aguardando renovação de token para requisição:', req.url);

  return authService.refreshToken().pipe(
    switchMap((response: any) => {
      console.log('Interceptor: Token renovado com sucesso. Retentando requisição:', req.url);
      return next(addToken(req, response.accessToken));
    }),
    catchError((err) => {
      console.error('Interceptor: Falha crítica na renovação, deslogando.', err);
      return throwError(() => err);
    })
  );
};
