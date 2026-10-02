import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular/standalone';
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
  private modalController = inject(ModalController);

  private readonly pendingShareKey = 'pending_share_code';

  private pendingSubject = new BehaviorSubject<PendingDeepLink | null>(null);
  pending$ = this.pendingSubject.asObservable();

  get pending(): PendingDeepLink | null {
    return this.pendingSubject.getValue();
  }

  clearPending(): void {
    this.pendingSubject.next(null);
  }

  handle(type: NotificationType, referenceId: number | null): void {
    if (type === 'POST_LIKED' && referenceId) {
      this.openPost(referenceId);
      return;
    }
    if (type === 'POST_COMMENTED' && referenceId) {
      this.openPost(referenceId, true);
      return;
    }
    if (type === 'INVITE_RECEIVED' || type === 'CHAT_MESSAGE') {
      this.pendingSubject.next({ type, referenceId });
    }
    this.navigateHome();
  }

  handleUrl(url: string): void {
    let pathname: string;
    try {
      pathname = new URL(url).pathname;
    } catch {
      return;
    }

    const match = pathname.match(/^\/v\/([A-Za-z0-9_-]+)\/?$/);
    if (match) {
      this.openSharedVideo(match[1]);
    }
  }

  private async openSharedVideo(code: string): Promise<void> {
    const topModal = await this.modalController.getTop();
    if (topModal) {
      await topModal.dismiss();
    }

    if (!this.authService.getDecodedToken<JwtPayload>()) {
      localStorage.setItem(this.pendingShareKey, code);
      this.router.navigateByUrl('/login');
      return;
    }
    this.router.navigate(['/v', code]);
  }

  private async openPost(postId: number, openComments = false): Promise<void> {
    const topModal = await this.modalController.getTop();
    if (topModal) {
      await topModal.dismiss();
    }
    this.router.navigate(['/post', postId], openComments ? { queryParams: { comments: 1 } } : {});
  }

  /** Rota do vídeo compartilhado que ficou aguardando o login, ou null. Consome o valor guardado. */
  consumePendingShareRoute(): string | null {
    const code = localStorage.getItem(this.pendingShareKey);
    if (!code) {
      return null;
    }
    localStorage.removeItem(this.pendingShareKey);
    return `/v/${code}`;
  }

  private navigateHome(): void {
    const pendingShareRoute = this.consumePendingShareRoute();
    if (pendingShareRoute) {
      this.router.navigateByUrl(pendingShareRoute);
      return;
    }
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    const isClube = decodedToken?.role === 'CLUBE';
    this.router.navigateByUrl(isClube ? '/scout-home' : '/player-home');
  }
}
