import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ToastController } from '@ionic/angular/standalone';

export interface User {
  id: string;
  email: string;
  hasProfile: boolean;
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

  constructor(private apiService: ApiService) {
    if (this.hasToken()) {
      this.getCurrentUser().subscribe({
        next: (user) => {
          this.currentUserSubject.next(user);
          this.authState.next(true);
        },
        error: () => {
          this.logout();
        }
      });
    }
  }

  getCurrentUser(): Observable<User> {
    return this.apiService.get<User>(`${this.authEndpoint}/me`).pipe(
      catchError(err => {
        console.error('Failed to fetch current user:', err);
        return throwError(() => err);
      })
    );
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
        const user: User = {
          id: response.userId.toString(),
          email: response.userEmail,
          hasProfile: response.hasProfile
        };
        this.currentUserSubject.next(user);
        this.showToast(response.message || 'Login bem-sucedido!', 'success');
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
        const user: User = {
          id: response.userId.toString(),
          email: response.userEmail,
          hasProfile: response.hasProfile
        };
        this.currentUserSubject.next(user);
        this.showToast(response.message || 'Login com Google bem-sucedido!', 'success');
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

  resetPassword(data: { email: string, code: string, newPassword: string }): Observable<any> {
    return this.apiService.post<any>(`${this.authEndpoint}/update-password`, data).pipe(
      tap((response) => {
        this.showToast(response.message || 'Senha redefinida com sucesso!', 'success');
      })
    );
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  refreshToken(): Observable<{ accessToken: string }> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return of();
    }

    return this.apiService.post<{ accessToken: string }>(`${this.authEndpoint}/refresh`, { refreshToken }).pipe(
      tap(tokens => {
        localStorage.setItem('access_token', tokens.accessToken);
      }),
      catchError(err => {
        this.logout();
        throw err;
      })
    );
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('access_token');
  }
}

