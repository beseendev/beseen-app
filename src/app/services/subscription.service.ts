import { Injectable, inject } from '@angular/core';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Plan, Subscription, SubscriptionSyncRequest, SubscriptionStatus } from '../models/subscription.model';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private apiService = inject(ApiService);

  private currentSubscriptionSubject = new BehaviorSubject<Subscription | null>(null);
  public currentSubscription$ = this.currentSubscriptionSubject.asObservable();

  constructor() {
    this.loadSubscriptionFromStorage();
  }

  private loadSubscriptionFromStorage() {
    const saved = localStorage.getItem('user_subscription');
    if (saved) {
      try {
        this.currentSubscriptionSubject.next(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('user_subscription');
      }
    }
  }

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
      tap(sub => this.saveSubscription(sub))
    );
  }

  private saveSubscription(sub: Subscription) {
    localStorage.setItem('user_subscription', JSON.stringify(sub));
    this.currentSubscriptionSubject.next(sub);
  }

  hasActiveSubscription(): boolean {
    const sub = this.currentSubscriptionSubject.value;
    if (!sub) return false;

    const isActive = sub.status === SubscriptionStatus.ACTIVE;
    const isNotExpired = !sub.endDate || new Date(sub.endDate) > new Date();

    return isActive && isNotExpired;
  }

  clearSubscription() {
    localStorage.removeItem('user_subscription');
    this.currentSubscriptionSubject.next(null);
  }
}
