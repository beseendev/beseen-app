import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PlayerChatMessage, PlayerChatThreadState } from '../models/player-chat.models';

@Injectable({
  providedIn: 'root'
})
export class PlayerChatUiService {
  private readonly storageKey = 'beseen_player_chat_threads';
  private readonly threads = this.loadThreads();
  private readonly threadsSubject = new BehaviorSubject<Record<string, PlayerChatThreadState>>(this.threads);

  readonly threads$ = this.threadsSubject.asObservable();

  getThread(scoutId: string, scoutName: string, scoutAvatarUrl?: string | null): PlayerChatThreadState {
    return this.threads[scoutId] ?? this.createThread(scoutId, scoutName, scoutAvatarUrl);
  }

  ensureInvite(scoutId: string, scoutName: string, scoutAvatarUrl?: string | null): PlayerChatThreadState {
    const existingThread = this.getThread(scoutId, scoutName, scoutAvatarUrl);
    if (existingThread.status !== 'SEM_CONVITE') {
      return existingThread;
    }

    const inviteMessage: PlayerChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'SCOUT',
      text: 'Tenho interesse no seu perfil. Se quiser, podemos conversar por aqui.',
      createdAt: new Date().toISOString()
    };

    const nextThread: PlayerChatThreadState = {
      ...existingThread,
      scoutName,
      scoutAvatarUrl: scoutAvatarUrl ?? existingThread.scoutAvatarUrl ?? null,
      status: 'CONVITE_RECEBIDO',
      messages: [inviteMessage]
    };

    this.saveThread(nextThread);
    return nextThread;
  }

  acceptInvite(scoutId: string, scoutName: string, scoutAvatarUrl?: string | null): PlayerChatThreadState {
    const currentThread = this.getThread(scoutId, scoutName, scoutAvatarUrl);
    const acceptanceMessage: PlayerChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'PLAYER',
      text: 'Convite aceito. Podemos conversar.',
      createdAt: new Date().toISOString()
    };

    const nextThread: PlayerChatThreadState = {
      ...currentThread,
      scoutName,
      scoutAvatarUrl: scoutAvatarUrl ?? currentThread.scoutAvatarUrl ?? null,
      status: 'LIBERADO',
      messages: [...currentThread.messages, acceptanceMessage]
    };

    this.saveThread(nextThread);
    return nextThread;
  }

  sendMessage(scoutId: string, scoutName: string, text: string, scoutAvatarUrl?: string | null): PlayerChatThreadState {
    const normalizedText = text.trim();
    const currentThread = this.getThread(scoutId, scoutName, scoutAvatarUrl);

    if (!normalizedText || currentThread.status !== 'LIBERADO') {
      return currentThread;
    }

    const nextThread: PlayerChatThreadState = {
      ...currentThread,
      scoutName,
      scoutAvatarUrl: scoutAvatarUrl ?? currentThread.scoutAvatarUrl ?? null,
      messages: [
        ...currentThread.messages,
        {
          id: `msg-${Date.now()}`,
          sender: 'PLAYER',
          text: normalizedText,
          createdAt: new Date().toISOString()
        }
      ]
    };

    this.saveThread(nextThread);
    return nextThread;
  }

  private saveThread(thread: PlayerChatThreadState): void {
    this.threads[thread.scoutId] = thread;
    this.threadsSubject.next({ ...this.threads });
    localStorage.setItem(this.storageKey, JSON.stringify(this.threads));
  }

  private createThread(scoutId: string, scoutName: string, scoutAvatarUrl?: string | null): PlayerChatThreadState {
    const thread: PlayerChatThreadState = {
      scoutId,
      scoutName,
      scoutAvatarUrl: scoutAvatarUrl ?? null,
      status: 'SEM_CONVITE',
      messages: []
    };

    this.threads[scoutId] = thread;
    return thread;
  }

  private loadThreads(): Record<string, PlayerChatThreadState> {
    const rawValue = localStorage.getItem(this.storageKey);
    if (!rawValue) {
      return {};
    }

    try {
      return JSON.parse(rawValue) as Record<string, PlayerChatThreadState>;
    } catch {
      localStorage.removeItem(this.storageKey);
      return {};
    }
  }
}
