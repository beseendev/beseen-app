import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging, Importance, Visibility } from '@capacitor-firebase/messaging';
import type { NotificationActionPerformedEvent, NotificationReceivedEvent } from '@capacitor-firebase/messaging';
import { Badge } from '@capawesome/capacitor-badge';
import { NotificationService } from './notification.service';
import { ChatService } from './chat.service';
import { DeepLinkService } from './deep-link.service';
import { NotificationType } from '../models/notification.models';

@Injectable({
  providedIn: 'root'
})
export class PushService {
  private static readonly ANDROID_CHANNEL_ID = 'default_channel';

  private readonly notificationService = inject(NotificationService);
  private readonly chatService = inject(ChatService);
  private readonly deepLinkService = inject(DeepLinkService);

  private initialized = false;
  async initialize(): Promise<void> {
    if (this.initialized || !Capacitor.isNativePlatform()) {
      return;
    }
    this.initialized = true;

    this.notificationService.unreadCount$.subscribe(count => {
      Badge.set({ count }).catch(err => console.error('Error setting app badge', err));
    });

    if (Capacitor.getPlatform() === 'android') {
      await this.createAndroidChannel();
    }

    try {
      const { receive } = await FirebaseMessaging.requestPermissions();
      if (receive !== 'granted') {
        return;
      }

      await this.registerToken();

      FirebaseMessaging.addListener('tokenReceived', () => {
        this.registerToken();
      });

      FirebaseMessaging.addListener('notificationReceived', event => {
        this.handleForegroundNotification(event);
      });

      FirebaseMessaging.addListener('notificationActionPerformed', event => {
        this.handleNotificationTap(event);
      });
    } catch (err) {
      console.error('Error initializing push notifications', err);
    }
  }

  private async createAndroidChannel(): Promise<void> {
    try {
      await FirebaseMessaging.createChannel({
        id: PushService.ANDROID_CHANNEL_ID,
        name: 'Notificações',
        importance: Importance.High,
        visibility: Visibility.Public,
        vibration: true
      });
    } catch (err) {
      console.error('Error creating Android notification channel', err);
    }
  }

  private async registerToken(): Promise<void> {
    try {
      const { token } = await FirebaseMessaging.getToken();
      const platform = Capacitor.getPlatform() as 'ios' | 'android';
      this.notificationService.registerDeviceToken(token, platform).subscribe();
    } catch (err) {
      console.error('Error registering device token', err);
    }
  }

  private handleForegroundNotification(event: NotificationReceivedEvent): void {
    this.applyCountsFromPayload(this.extractData(event.notification.data));
  }

  private handleNotificationTap(event: NotificationActionPerformedEvent): void {
    const data = this.extractData(event.notification.data);
    this.applyCountsFromPayload(data);

    const type = data['type'] as NotificationType | undefined;
    if (!type) {
      return;
    }

    const referenceId = data['referenceId'] ? Number(data['referenceId']) : null;
    this.deepLinkService.handle(type, referenceId);
  }

  private applyCountsFromPayload(data: Record<string, string>): void {
    if (data['unreadCount'] !== undefined) {
      this.notificationService.setUnreadCount(Number(data['unreadCount']));
    }
    if (data['chatUnreadCount'] !== undefined) {
      this.chatService.setThreadsUnreadCount(Number(data['chatUnreadCount']));
    }
  }

  private extractData(data: unknown): Record<string, string> {
    return (data ?? {}) as Record<string, string>;
  }
}
