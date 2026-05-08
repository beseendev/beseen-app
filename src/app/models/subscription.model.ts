export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELED = 'CANCELED',
  PENDING = 'PENDING'
}

export interface Plan {
  id: number;
  name: string;
  description: string;
  revenueCatProductId: string;
}

export interface Subscription {
  id: number;
  plan: Plan;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  revenueCatCustomerId: string;
}

export interface SubscriptionSyncRequest {
  revenueCatCustomerId: string;
  productId: string;
  transactionId?: string;
}
