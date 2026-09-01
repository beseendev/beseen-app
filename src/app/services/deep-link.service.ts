import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService, JwtPayload } from './auth.service';
import { NotificationType } from '../models/notification.models';

export interface PendingDeepLink {
  type: NotificationType;
  referenceId: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class DeepLinkService {
  private router = inject(Router);
  private authService = inject(AuthService);

  private pendingSubject = new BehaviorSubject<PendingDeepLink | null>(null);
  pending$ = this.pendingSubject.asObservable();

  get pending(): PendingDeepLink | null {
    return this.pendingSubject.getValue();
  }

  clearPending(): void {
    this.pendingSubject.next(null);
  }

  handle(type: NotificationType, referenceId: number | null): void {
    if (type === 'INVITE_RECEIVED' || type === 'CHAT_MESSAGE') {
      this.pendingSubject.next({ type, referenceId });
    }
    this.navigateHome();
  }

  private navigateHome(): void {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    const isClube = decodedToken?.role === 'CLUBE';
    this.router.navigateByUrl(isClube ? '/scout-home' : '/player-home');
  }
}
