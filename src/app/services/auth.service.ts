import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ToastController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authState = new BehaviorSubject<boolean>(this.hasToken());
  private readonly authEndpoint = '/auth';
  private readonly authSocial = '/auth/social';

  private toastController = inject(ToastController);

  constructor(private apiService: ApiService) { }

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
        this.showToast(response.message || 'Login bem-sucedido!', 'success');
      }),
      catchError(err => {
        this.authState.next(false);
        throw err;
      })
    );
  }

  loginWithFirebaseToken(idToken: string): Observable<any> {
    return this.apiService.post<any>(`${this.authSocial}/google`, { idToken }).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.accessToken);
        localStorage.setItem('refresh_token', response.refreshToken);
        this.authState.next(true);
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
    this.showToast('Você foi desconectado.', 'success');
  }

  register(userData: any): Observable<any> {
    return this.apiService.post<any>(`${this.authEndpoint}/register-user`, userData).pipe(
      tap(response => {
        this.showToast(response.message || 'Registro realizado com sucesso!', 'success');
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

