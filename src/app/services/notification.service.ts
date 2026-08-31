import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { ApiService } from './api.service';
import { NotificationDTO, NotificationPageResponse } from '../models/notification.models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiService = inject(ApiService);

  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  list(page: number = 0, limit: number = 10): Observable<NotificationPageResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.apiService.get<NotificationPageResponse>('/notification', { params });
  }

  refreshUnreadCount(): Observable<{ count: number }> {
    return this.apiService.get<{ count: number }>('/notification/unread-count').pipe(
      tap(res => this.unreadCountSubject.next(res.count))
    );
  }

  markAllAsRead(): Observable<void> {
    return this.apiService.post<void>('/notification', {}).pipe(
      tap(() => this.unreadCountSubject.next(0))
    );
  }

  registerDeviceToken(token: string, platform: 'ios' | 'android'): Observable<void> {
    return this.apiService.post<void>('/notification/device-token', { token, platform });
  }
}
