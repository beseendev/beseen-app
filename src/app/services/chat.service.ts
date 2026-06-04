import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { ApiService } from './api.service';
import { HttpParams } from '@angular/common/http';
import {ChatThreadSummaryDTO, ChatMessageResponse, ChatThreadPageResponse} from '../models/player-chat.models';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiService = inject(ApiService);

  private threadsSubject = new BehaviorSubject<ChatThreadSummaryDTO[]>([]);
  threads$ = this.threadsSubject.asObservable();

  private activeChatsCountSubject = new BehaviorSubject<number>(0);
  activeChatsCount$ = this.activeChatsCountSubject.asObservable();

  private pendingInvitesCountSubject = new BehaviorSubject<number>(0);
  pendingInvitesCount$ = this.pendingInvitesCountSubject.asObservable();

  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  isLoading$ = this.isLoadingSubject.asObservable();

  loadThreads(limit: number = 10, page: number = 0): Observable<ChatThreadPageResponse> {
    this.isLoadingSubject.next(true);
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('page', page.toString());

    return this.apiService.get<ChatThreadPageResponse>('/chat/threads', { params }).pipe(
      tap(response => {
        this.activeChatsCountSubject.next(response.totalElements);
        this.threadsSubject.next(response.items);
        this.isLoadingSubject.next(false);
      })
    );
  }

  refreshInviteCount(): Observable<{ count: number }> {
    return this.apiService.get<{ count: number }>('/posts/invites/count').pipe(
      tap(res => this.pendingInvitesCountSubject.next(res.count))
    );
  }

  clearThreads(): void {
    this.threadsSubject.next([]);
    this.isLoadingSubject.next(false);
  }

  getMessages(threadId: number, cursor?: string, limit: number = 20): Observable<ChatMessageResponse[]> {
    let params = new HttpParams().set('limit', limit.toString());
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    return this.apiService.get<ChatMessageResponse[]>(`/chat/threads/${threadId}/messages`, { params });
  }

  sendMessage(threadId: number, text: string): Observable<ChatMessageResponse> {
    return this.apiService.post<ChatMessageResponse>(`/chat/threads/${threadId}/messages`, { text }).pipe(
      tap(newMessage => {
        // Optionally update the local threads list with the last message
        const currentThreads = this.threadsSubject.getValue();
        const threadIndex = currentThreads.findIndex(t => t.chatThreadId === threadId);
        if (threadIndex !== -1) {
          const updatedThreads = [...currentThreads];
          updatedThreads[threadIndex] = {
            ...updatedThreads[threadIndex],
            lastMessage: newMessage.text,
            lastMessageAt: newMessage.createdAt
          };
          this.threadsSubject.next(updatedThreads);
        }
      })
    );
  }
}
