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

  if (accessToken && req.url.startsWith(environment.apiUrl)) {
    req = addToken(req, accessToken);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status === 401 &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/refresh')
      ) {
        return handle401Error(req, next, authService, subscriptionService, modalService);
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

const handle401Error = (
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

        const decodedToken = jwtDecode<JwtPayload>(response.accessToken);
        /* MOCK: Desabilitado temporariamente para acesso total
        if (decodedToken.role === 'CLUBE') {
          const isStatusActive = decodedToken.subscriptionStatus === SubscriptionStatus.ACTIVE;
          const isDateExpired = decodedToken.subscriptionEndDate
            ? new Date(decodedToken.subscriptionEndDate) < new Date()
            : false;

          if (!isStatusActive || isDateExpired) {
            if (isDateExpired) {
              subscriptionService.expireExpired().subscribe();
            }
            modalService.openPlansModal();
          }
        }
        */

        return next(addToken(req, response.accessToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        authService.logout();
        return throwError(() => err);
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter(token => token != null),
      take(1),
      switchMap(token => {
        return next(addToken(req, token));
      })
    );
  }
};
