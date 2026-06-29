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

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<any>(null);

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
      return handleTokenRefresh(req, next, authService, subscriptionService, modalService);
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
        return handleTokenRefresh(req, next, authService, subscriptionService, modalService);
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
  authService: AuthService,
  subscriptionService: SubscriptionService,
  modalService: ModalStateService
): Observable<HttpEvent<any>> => {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((response: any) => {
        isRefreshing = false;
        refreshTokenSubject.next(response.accessToken);
        return next(addToken(req, response.accessToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        authService.logout();
        return throwError(() => err);
      })
    );
  } else {
    // Se já está renovando, espera o novo token emitido pelo Subject e tenta de novo
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        return next(addToken(req, token!));
      })
    );
  }
};
