import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChatMessage, ChatStatus, ChatThreadState } from '../models/chat.models';

@Injectable({
  providedIn: 'root'
})
export class ChatUiService {
  private readonly storageKey = 'beseen_chat_ui_threads';
  private readonly threadsSubject = new BehaviorSubject<Record<string, ChatThreadState>>(this.loadInitialThreads());

  readonly threads$ = this.threadsSubject.asObservable();

  getThreadsSnapshot(): Record<string, ChatThreadState> {
    return this.threadsSubject.getValue();
  }

  getThread(athleteId: string, athleteName: string, athleteAvatarUrl?: string | null): ChatThreadState {
    return this.threadsSubject.getValue()[athleteId] ?? this.createDefaultThread(athleteId, athleteName, athleteAvatarUrl);
  }

  watchThread(athleteId: string, athleteName: string, athleteAvatarUrl?: string | null): Observable<ChatThreadState> {
    return this.threads$.pipe(
      map(threads => threads[athleteId] ?? this.createDefaultThread(athleteId, athleteName, athleteAvatarUrl))
    );
  }

  watchStatus(athleteId: string, athleteName: string, athleteAvatarUrl?: string | null): Observable<ChatStatus> {
    return this.watchThread(athleteId, athleteName, athleteAvatarUrl).pipe(
      map(thread => thread.status)
    );
  }

  sendInvite(athleteId: string, athleteName: string, athleteAvatarUrl?: string | null): ChatThreadState {
    const currentThread = this.getThread(athleteId, athleteName, athleteAvatarUrl);
    const nextThread: ChatThreadState = {
      ...currentThread,
      athleteName,
      athleteAvatarUrl: athleteAvatarUrl ?? currentThread.athleteAvatarUrl ?? null,
      status: 'AGUARDANDO_CONFIRMACAO'
    };

    this.saveThread(nextThread);
    return nextThread;
  }

  forceAcceptForDemo(athleteId: string, athleteName: string, athleteAvatarUrl?: string | null): ChatThreadState {
    const currentThread = this.getThread(athleteId, athleteName, athleteAvatarUrl);
    const alreadyHasAcceptance = currentThread.messages.some(
      message => message.sender === 'ATHLETE' && message.text.includes('Aceitei conversar')
    );

    const acceptanceMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'ATHLETE',
      text: 'Aceitei conversar. Podemos falar por aqui.',
      createdAt: new Date().toISOString()
    };

    const nextThread: ChatThreadState = {
      ...currentThread,
      athleteName,
      athleteAvatarUrl: athleteAvatarUrl ?? currentThread.athleteAvatarUrl ?? null,
      status: 'LIBERADO',
      messages: alreadyHasAcceptance
        ? currentThread.messages
        : [...currentThread.messages, acceptanceMessage]
    };

    this.saveThread(nextThread);
    return nextThread;
  }

  getMessages(athleteId: string, athleteName: string, athleteAvatarUrl?: string | null): Observable<ChatMessage[]> {
    return this.watchThread(athleteId, athleteName, athleteAvatarUrl).pipe(
      map(thread => thread.messages)
    );
  }

  sendMessage(athleteId: string, athleteName: string, text: string, athleteAvatarUrl?: string | null): ChatThreadState {
    const normalizedText = text.trim();
    if (!normalizedText) {
      return this.getThread(athleteId, athleteName, athleteAvatarUrl);
    }

    const currentThread = this.getThread(athleteId, athleteName, athleteAvatarUrl);
    const nextThread: ChatThreadState = {
      ...currentThread,
      athleteName,
      athleteAvatarUrl: athleteAvatarUrl ?? currentThread.athleteAvatarUrl ?? null,
      status: currentThread.status === 'LIBERADO' ? 'LIBERADO' : currentThread.status,
      messages: [
        ...currentThread.messages,
        {
          id: `msg-${Date.now()}`,
          sender: 'SCOUT',
          text: normalizedText,
          createdAt: new Date().toISOString()
        }
      ]
    };

    this.saveThread(nextThread);
    return nextThread;
  }

  private saveThread(thread: ChatThreadState): void {
    const nextThreads = {
      ...this.threadsSubject.getValue(),
      [thread.athleteId]: thread
    };

    this.threadsSubject.next(nextThreads);
    localStorage.setItem(this.storageKey, JSON.stringify(nextThreads));
  }

  private createDefaultThread(
    athleteId: string,
    athleteName: string,
    athleteAvatarUrl?: string | null
  ): ChatThreadState {
    return {
      athleteId,
      athleteName,
      athleteAvatarUrl: athleteAvatarUrl ?? null,
      status: 'BLOQUEADO',
      messages: []
    };
  }

  private loadInitialThreads(): Record<string, ChatThreadState> {
    const rawThreads = localStorage.getItem(this.storageKey);
    if (!rawThreads) {
      return {};
    }

    try {
      return JSON.parse(rawThreads) as Record<string, ChatThreadState>;
    } catch (error) {
      console.error('Failed to parse chat UI threads from local storage', error);
      localStorage.removeItem(this.storageKey);
      return {};
    }
  }
}
