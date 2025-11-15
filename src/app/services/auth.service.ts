import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authState = new BehaviorSubject<boolean>(this.hasToken());
  private readonly authEndpoint = '/auth';
  private readonly authSocial = '/auth/social'

  constructor(private apiService: ApiService) { }

  isAuthenticated(): Observable<boolean> {
    return this.authState.asObservable();
  }

  login(credentials: {email: string, password: string}): Observable<any> {
    return this.apiService.post<{ accessToken: string, refreshToken: string }>(`${this.authEndpoint}/login`, credentials).pipe(
      tap(tokens => {
        localStorage.setItem('access_token', tokens.accessToken);
        localStorage.setItem('refresh_token', tokens.refreshToken);
        this.authState.next(true);
      }),
      catchError(err => {
        console.error('Erro de login:', err);
        this.authState.next(false);
        throw err;
      })
    );
  }

  loginWithFirebaseToken(idToken: string): Observable<any> {
    return this.apiService.post<{ accessToken: string, refreshToken: string }>(`${this.authSocial}/google`, { idToken }).pipe(
      tap(tokens => {
        localStorage.setItem('access_token', tokens.accessToken);
        localStorage.setItem('refresh_token', tokens.refreshToken);
        this.authState.next(true);
      }),
      catchError(err => {
        console.error('Erro de login com Google:', err);
        this.authState.next(false);
        throw err;
      })
    );
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.authState.next(false);
  }

  register(userData: any): Observable<any> {
    // The endpoint for registration might be different, e.g., '/users' or '/register'
    return this.apiService.post('/users', userData).pipe(
      catchError(err => {
        console.error('Erro de registro:', err);
        throw err;
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

