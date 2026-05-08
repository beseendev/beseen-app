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
  price: string;
  period: string;
  featured: boolean;
  features: string[];
  restrictions: string[];
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
