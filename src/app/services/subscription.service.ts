import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Plan, Subscription } from '../models/subscription.model';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private apiService = inject(ApiService);

  private currentSubscriptionSubject = new BehaviorSubject<Subscription | null>(null);
  public currentSubscription$ = this.currentSubscriptionSubject.asObservable();

  hasActiveSubscription(): boolean {
    return true; // MOCK: Acesso liberado para todos
  }

  getPlanName(): string | null {
    const token = localStorage.getItem('access_token');
    if (!token) return 'Clube'; // MOCK: Assume o plano mais alto
    try {
      const decoded = jwtDecode<any>(token);
      return decoded.planName || 'Clube';
    } catch {
      return 'Clube';
    }
  }

  canViewProfiles(): boolean {
    return true; // MOCK
  }

  canSendInvites(): boolean {
    return true; // MOCK
  }

  canSendMoreInvites(currentThreadsCount: number): boolean {
    return true; // MOCK
  }

  canAccessChat(): boolean {
    return true; // MOCK
  }

  hasFullProfileAccess(): boolean {
    return true; // MOCK
  }

  getPlans(): Observable<Plan[]> {
    return this.apiService.get<Plan[]>('/subscriptions/plans');
  }

  getMySubscription(): Observable<Subscription> {
    return this.apiService.get<Subscription>('/subscriptions/my-subscription').pipe(
      tap(sub => this.saveSubscription(sub)),
      catchError(err => {
        this.clearSubscription();
        throw err;
      })
    );
  }

  expireExpired(): Observable<any> {
    return this.apiService.post<any>('/subscriptions/expire-expired', {});
  }

  private saveSubscription(sub: Subscription) {
    localStorage.setItem('user_subscription', JSON.stringify(sub));
    this.currentSubscriptionSubject.next(sub);
  }

  clearSubscription() {
    localStorage.removeItem('user_subscription');
    this.currentSubscriptionSubject.next(null);
  }
}
