import { Injectable, inject } from '@angular/core';
import { Purchases, LOG_LEVEL, CustomerInfo } from '@revenuecat/purchases-capacitor';
import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Plan, Subscription, SubscriptionSyncRequest, SubscriptionStatus } from '../models/subscription.model';
import { Capacitor } from '@capacitor/core';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../environments/environment';

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
      const platform = Capacitor.getPlatform();
      let apiKey = '';

      if (platform === 'ios') {
        apiKey = environment.revenueCatIosKey;
      } else if (platform === 'android') {
        apiKey = environment.revenueCatAndroidKey;
      }

      if (!apiKey) {
        console.error('RevenueCat: API Key não configurada para a plataforma:', platform);
        return;
      }

      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      await Purchases.configure({
        apiKey: apiKey,
        appUserID: userId
      });

      Purchases.addCustomerInfoUpdateListener((info) => {
        this.handleCustomerInfoUpdate(info);
      });

    } catch (e) {
      console.error('Erro ao inicializar RevenueCat', e);
    }
  }

  private handleCustomerInfoUpdate(info: CustomerInfo) {
    console.log('Customer Info atualizado:', info);
  }

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
        transactionId: (purchaseResult as any).transaction?.transactionIdentifier || 'unknown'
      };

      return this.syncWithBackend(syncRequest).toPromise() as Promise<Subscription>;
    } catch (error: any) {
      if (error.userCancelled) {
        console.log('Usuário cancelou a compra');
        throw { userCancelled: true };
      }
      console.error('Erro na compra:', error);
      throw error;
    }
  }

  async restorePurchases(): Promise<Subscription | null> {
    if (!Capacitor.isNativePlatform()) return null;

    try {
      const result = await Purchases.restorePurchases();
      const customerInfo = result.customerInfo;
      console.log('Restauração concluída:', customerInfo);

      const activeEntitlements = Object.values(customerInfo.entitlements.active);

      if (activeEntitlements.length > 0) {
        const latestEntitlement = activeEntitlements[0] as any;
        const syncRequest: SubscriptionSyncRequest = {
          revenueCatCustomerId: customerInfo.originalAppUserId,
          productId: latestEntitlement.productIdentifier,
          transactionId: 'RESTORE_FLOW'
        };
        return this.syncWithBackend(syncRequest).toPromise() as Promise<Subscription>;
      }

      return null;
    } catch (error) {
      console.error('Erro ao restaurar compras:', error);
      throw error;
    }
  }

  private syncWithBackend(request: SubscriptionSyncRequest): Observable<Subscription> {
    return this.apiService.post<Subscription>('/subscriptions/sync', request).pipe(
      tap(sub => {
        this.saveSubscription(sub);
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

