import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonRefresher,
  IonRefresherContent,
  IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  mailOutline,
  chatbubbleEllipsesOutline,
  videocamOutline,
  timeOutline,
  notificationsOutline
} from 'ionicons/icons';
import { Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';
import { DeepLinkService } from '../services/deep-link.service';
import { AuthService, JwtPayload } from '../services/auth.service';
import { NotificationDTO, NotificationType } from '../models/notification.models';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    IonContent,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonRefresher,
    IonRefresherContent,
    IonSpinner
  ]
})
export class NotificationsPage implements OnInit {
  notifications: NotificationDTO[] = [];
  isLoading = false;
  hasMore = true;

  private readonly PAGE_SIZE = 10;
  private currentPage = 0;

  private readonly notificationService = inject(NotificationService);
  private readonly deepLinkService = inject(DeepLinkService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    addIcons({
      arrowBackOutline,
      mailOutline,
      chatbubbleEllipsesOutline,
      videocamOutline,
      timeOutline,
      notificationsOutline
    });
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(event?: any): void {
    this.notifications = [];
    this.currentPage = 0;
    this.hasMore = true;
    this.loadNotifications();
    this.notificationService.markAllAsRead().subscribe();
    if (event) {
      event.target.complete();
    }
  }

  loadNotifications(event?: any): void {
    if (this.isLoading || (!this.hasMore && event)) {
      if (event) event.target.complete();
      return;
    }

    this.isLoading = true;
    this.notificationService.list(this.currentPage, this.PAGE_SIZE).subscribe({
      next: (response) => {
        this.notifications = [...this.notifications, ...response.items];
        this.hasMore = this.notifications.length < response.totalElements;
        this.currentPage++;
        this.isLoading = false;

        if (event) {
          event.target.complete();
        }
      },
      error: (err) => {
        console.error('Error loading notifications', err);
        this.hasMore = false;
        this.isLoading = false;
        if (event) {
          event.target.complete();
        }
      }
    });
  }

  openNotification(notification: NotificationDTO): void {
    this.deepLinkService.handle(notification.type, notification.referenceId);
  }

  goBack(): void {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    const isClube = decodedToken?.role === 'CLUBE';
    this.router.navigateByUrl(isClube ? '/scout-home' : '/player-home');
  }

  iconFor(type: NotificationType): string {
    switch (type) {
      case 'INVITE_RECEIVED':
        return 'mail-outline';
      case 'CHAT_MESSAGE':
        return 'chatbubble-ellipses-outline';
      case 'NO_VIDEO_POSTED':
        return 'videocam-outline';
      case 'INACTIVITY_REMINDER':
        return 'time-outline';
      default:
        return 'notifications-outline';
    }
  }

  timeAgo(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `há ${diffMin} min`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `há ${diffHours} h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `há ${diffDays} d`;

    return new Date(dateStr).toLocaleDateString('pt-BR');
  }

  trackByNotification(_: number, notification: NotificationDTO): number {
    return notification.id;
  }
}
