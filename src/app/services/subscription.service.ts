import { Injectable, inject } from '@angular/core';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Plan, Subscription, SubscriptionSyncRequest, SubscriptionStatus } from '../models/subscription.model';
import { Capacitor } from '@capacitor/core';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private apiService = inject(ApiService);

  private currentSubscriptionSubject = new BehaviorSubject<Subscription | null>(null);
  public currentSubscription$ = this.currentSubscriptionSubject.asObservable();

  async initializeRevenueCat(userId: string) {
    if (!Capacitor.isNativePlatform()) {
      console.warn('RevenueCat: Ignorando inicialização no Navegador');
      return;
    }
    try {
      await Purchases.configure({
        apiKey: 'goog_placeholder_api_key',
        appUserID: userId
      });
    } catch (e) {
      console.error('Erro ao inicializar RevenueCat', e);
    }
  }

  hasActiveSubscription(): boolean {
    const token = localStorage.getItem('access_token');
    if (!token) return false;
    try {
      const decoded = jwtDecode<any>(token);
      const status = decoded.subscriptionStatus;
      const endDateStr = decoded.subscriptionEndDate;

      if (status !== SubscriptionStatus.ACTIVE) return false;

      if (endDateStr) {
        return new Date(endDateStr) > new Date();
      }

      return true;
    } catch {
      return false;
    }
  }

  getPlanName(): string | null {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
      const decoded = jwtDecode<any>(token);
      return decoded.planName;
    } catch {
      return null;
    }
  }

  canViewProfiles(): boolean {
    if (!this.hasActiveSubscription()) return false;
    const plan = this.getPlanName();
    return plan === 'Clube' || plan === 'Contato';
  }

  canSendInvites(): boolean {
    if (!this.hasActiveSubscription()) return false;
    const plan = this.getPlanName();
    return plan === 'Clube' || plan === 'Contato';
  }

  canSendMoreInvites(currentThreadsCount: number): boolean {
    if (!this.hasActiveSubscription()) return false;
    const plan = this.getPlanName();
    if (plan === 'Clube') return true;
    if (plan === 'Contato') return currentThreadsCount < 2;
    return false;
  }

  canAccessChat(): boolean {
    if (!this.hasActiveSubscription()) return false;
    const plan = this.getPlanName();
    return plan === 'Clube' || plan === 'Contato';
  }

  hasFullProfileAccess(): boolean {
    if (!this.hasActiveSubscription()) return false;
    const plan = this.getPlanName();
    return plan === 'Clube';
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

  async purchasePlan(plan: Plan): Promise<Subscription> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Modo Web: Simulando sincronização com backend...');
      return this.syncWithBackend({
        revenueCatCustomerId: 'web_tester',
        productId: plan.revenueCatProductId,
        transactionId: 'web_mock_' + Date.now()
      }).toPromise() as Promise<Subscription>;
    }

    try {
      const offerings = await Purchases.getOfferings();

      const pkg = offerings.current?.availablePackages.find(p => p.product.identifier === plan.revenueCatProductId);

      if (!pkg) throw new Error('Plano não disponível no RevenueCat');

      const purchaseResult = await Purchases.purchasePackage({ aPackage: pkg });

      const syncRequest: SubscriptionSyncRequest = {
        revenueCatCustomerId: purchaseResult.customerInfo.originalAppUserId,
        productId: plan.revenueCatProductId,
        transactionId: purchaseResult.transaction.transactionIdentifier
      };

      return this.syncWithBackend(syncRequest).toPromise() as Promise<Subscription>;
    } catch (error) {
      console.error('Erro na compra:', error);
      throw error;
    }
  }

  private syncWithBackend(request: SubscriptionSyncRequest): Observable<Subscription> {
    return this.apiService.post<Subscription>('/subscriptions/sync', request).pipe(
      tap(sub => {
        this.saveSubscription(sub);
        // Ao sincronizar, limpamos o token antigo para forçar o interceptor a renová-lo
        // ou solicitamos um novo token se o backend retornar
      })
    );
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
