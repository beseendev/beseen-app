import { Injectable } from '@angular/core';

export interface ScoutContactMessage {
  id: string;
  sender: 'scout' | 'athlete';
  text: string;
  createdAt: string;
}

export interface ScoutContactRequest {
  athleteId: string;
  athleteName: string;
  status: 'idle' | 'pending' | 'approved';
  messages: ScoutContactMessage[];
}

@Injectable({
  providedIn: 'root'
})
export class ScoutContactService {
  private readonly storageKey = 'beseen_scout_contact_requests';

  getRequest(athleteId: string): ScoutContactRequest {
    const requests = this.getRequestsMap();
    return requests[athleteId] ?? {
      athleteId,
      athleteName: '',
      status: 'idle',
      messages: []
    };
  }

  sendInterestEmail(athleteId: string, athleteName: string): ScoutContactRequest {
    const requests = this.getRequestsMap();
    const nextRequest: ScoutContactRequest = {
      athleteId,
      athleteName,
      status: 'pending',
      messages: requests[athleteId]?.messages ?? []
    };

    requests[athleteId] = nextRequest;
    this.saveRequestsMap(requests);
    return nextRequest;
  }

  approveContact(athleteId: string, athleteName: string): ScoutContactRequest {
    const requests = this.getRequestsMap();
    const currentRequest = requests[athleteId];

    const baseMessages = currentRequest?.messages ?? [];
    const hasApprovalMessage = baseMessages.some(
      message => message.sender === 'athlete' && message.text.includes('Aceitei conversar')
    );

    const approvalMessage: ScoutContactMessage = {
      id: `msg-${Date.now()}`,
      sender: 'athlete',
      text: 'Aceitei conversar. Podemos falar por aqui.',
      createdAt: new Date().toISOString()
    };

    const nextMessages = hasApprovalMessage
      ? baseMessages
      : [...baseMessages, approvalMessage];

    const nextRequest: ScoutContactRequest = {
      athleteId,
      athleteName,
      status: 'approved',
      messages: nextMessages
    };

    requests[athleteId] = nextRequest;
    this.saveRequestsMap(requests);
    return nextRequest;
  }

  appendScoutMessage(athleteId: string, athleteName: string, text: string): ScoutContactRequest {
    const requests = this.getRequestsMap();
    const currentRequest = requests[athleteId];

    const nextRequest: ScoutContactRequest = {
      athleteId,
      athleteName,
      status: currentRequest?.status === 'approved' ? 'approved' : 'pending',
      messages: [
        ...(currentRequest?.messages ?? []),
        {
          id: `msg-${Date.now()}`,
          sender: 'scout',
          text,
          createdAt: new Date().toISOString()
        }
      ]
    };

    requests[athleteId] = nextRequest;
    this.saveRequestsMap(requests);
    return nextRequest;
  }

  private getRequestsMap(): Record<string, ScoutContactRequest> {
    const rawValue = localStorage.getItem(this.storageKey);
    if (!rawValue) {
      return {};
    }

    try {
      return JSON.parse(rawValue) as Record<string, ScoutContactRequest>;
    } catch (error) {
      console.error('Failed to parse scout contact requests from local storage', error);
      localStorage.removeItem(this.storageKey);
      return {};
    }
  }

  private saveRequestsMap(requests: Record<string, ScoutContactRequest>): void {
    localStorage.setItem(this.storageKey, JSON.stringify(requests));
  }
}
