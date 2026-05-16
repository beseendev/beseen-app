import { Injectable, inject } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import {tap, catchError, map} from 'rxjs/operators';
import { ApiService } from './api.service';
import { ToastController } from '@ionic/angular/standalone';
import { SubscriptionService } from './subscription.service';

export interface User {
  id: string;
  email: string;
  hasProfile: boolean;
  profileId: number | null;
  scoutType?: string | null;
  acceptedTerms?: boolean;
}

export interface JwtPayload {
  sub: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  clubName: string | null;
  scoutType: string | null;
  subscriptionEndDate: string | null;
  subscriptionStatus: string | null;
  planName: string | null;
  acceptedTerms?: boolean;
  exp?: number;
  iat?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authState = new BehaviorSubject<boolean>(this.hasToken());
  private currentUserSubject: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);
  public currentUser: Observable<User | null> = this.currentUserSubject.asObservable();
  private readonly authEndpoint = '/auth';
  private readonly authSocial = '/auth/social';

  private toastController = inject(ToastController);
  private subscriptionService = inject(SubscriptionService);

  constructor(private apiService: ApiService) {
    if (this.hasToken()) {
      this.getCurrentUser().subscribe({
        next: (user) => {
          this.checkSubscriptionIfNeeded(user);
        },
        error: () => {
          this.logout();
        }
      });
    }
  }

  private checkSubscriptionIfNeeded(user: User) {
    const decodedToken = this.getDecodedToken<JwtPayload>();
    if (decodedToken?.role === 'CLUBE') {
      this.subscriptionService.initializeRevenueCat(user.id);
    }
  }

  getCurrentUser(): Observable<User> {
    return this.apiService.get<any>('/profile/me').pipe(
      map(response => {
        const decodedToken = this.getDecodedToken<JwtPayload>();
        const user: User = {
          id: response.id?.toString(),
          email: response.email,
          hasProfile: response.hasProfile,
          profileId: response.profileId,
          scoutType: decodedToken?.scoutType
        };
        return user;
      }),
      tap(user => {
        this.currentUserSubject.next(user);
        this.authState.next(true);
        this.checkSubscriptionIfNeeded(user);
      }),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  acceptTerms(): Observable<any> {
    return this.apiService.post<any>(`${this.authEndpoint}/accept-terms`, {}).pipe(
      tap(() => {
        const user = this.currentUserSubject.value;
        if (user) {
          this.currentUserSubject.next({ ...user, acceptedTerms: true });
        }
      })
    );
  }

  refreshCurrentUser(): Observable<User> {
    return this.getCurrentUser();
  }

  private async showToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'top'
    });
    toast.present();
  }

  isAuthenticated(): Observable<boolean> {
    return this.authState.asObservable();
  }

  login(credentials: {email: string, password: string}): Observable<any> {
    return this.apiService.post<any>(`${this.authEndpoint}/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.accessToken);
        localStorage.setItem('refresh_token', response.refreshToken);
        this.authState.next(true);
        const decodedToken = this.getDecodedToken<JwtPayload>();
        const user: User = {
          id: response.userId.toString(),
          email: response.userEmail,
          hasProfile: response.hasProfile,
          profileId: null,
          scoutType: decodedToken?.scoutType
        };
        this.currentUserSubject.next(user);
      }),
      catchError(err => {
        this.authState.next(false);
        if (err.status === 401 && err.error?.message === 'User is not enabled. Please confirm your email.') {
          return throwError(() => ({ ...err, isUserNotEnabled: true }));
        }
        return throwError(() => err);
      })
    );
  }

  loginWithFirebaseToken(idToken: string): Observable<any> {
    return this.apiService.post<any>(`${this.authSocial}/google`, { idToken }).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.accessToken);
        localStorage.setItem('refresh_token', response.refreshToken);
        this.authState.next(true);
        const decodedToken = this.getDecodedToken<JwtPayload>();
        const user: User = {
          id: response.userId.toString(),
          email: response.userEmail,
          hasProfile: response.hasProfile,
          profileId: null,
          scoutType: decodedToken?.scoutType
        };
        this.currentUserSubject.next(user);
      }),
      catchError(err => {
        this.authState.next(false);
        throw err;
      })
    );
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.subscriptionService.clearSubscription();
    this.authState.next(false);
    this.currentUserSubject.next(null);
    this.showToast('Você foi desconectado.', 'success');
  }

  register(userData: any): Observable<any> {
    return this.apiService.post<any>(`${this.authEndpoint}/register-user`, userData).pipe(
      tap(() => {
        this.showToast('Registro realizado com sucesso. Por favor, verifique seu e-mail para confirmar sua conta.', 'success');
      })
    );
  }

  confirmAccountByCode(data: { email: string, code: string }): Observable<any> {
    return this.apiService.post<any>(`${this.authEndpoint}/confirm-code`, data).pipe(
      tap((response) => {
        this.showToast(response.message || 'Conta confirmada com sucesso! Faça o login.', 'success');
      })
    );
  }

  resendConfirmationCode(data: { email: string }): Observable<any> {
    return this.apiService.post<any>(`${this.authEndpoint}/resend-confirmation-code`, data).pipe(
      tap((response) => {
        this.showToast(response.message || 'Novo código enviado para seu e-mail.', 'success');
      })
    );
  }


  sendPasswordResetCode(email: string): Observable<any> {
    return this.apiService.post<any>(`${this.authEndpoint}/send-confirmation-code-update-password`, { email }).pipe(
      tap((response) => {
        this.showToast(response.message || 'Código de recuperação enviado para seu e-mail.', 'success');
      })
    );
  }

  resetPassword(data: { email: string, code: string, password: string }): Observable<any> {
    return this.apiService.post<any>(`${this.authEndpoint}/update-password`, data).pipe(
      tap((response) => {
        this.showToast(response.message || 'Senha redefinida com sucesso!', 'success');
      })
    );
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getDecodedToken<T>(): T | null {
    const token = this.getAccessToken();
    if (token) {
      try {
        return jwtDecode<T>(token);
      } catch (error) {
        console.error('Failed to decode token:', error);
        return null;
      }
    }
    return null;
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  refreshToken(): Observable<{ accessToken: string }> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.apiService.post<{ accessToken: string, refreshToken: string }>(
      `${this.authEndpoint}/refresh-token`,
      { refreshToken }
    ).pipe(
      tap(tokens => {
        localStorage.setItem('access_token', tokens.accessToken);
        if (tokens.refreshToken) {
          localStorage.setItem('refresh_token', tokens.refreshToken);
        }
      }),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('access_token');
  }
}

