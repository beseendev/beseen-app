// chat.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PaginationService } from './pagination.service';

export interface Contact {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  urlProfileImage?: string;
  lastMessage?: string;
  unreadCount?: number;
  lastSeen?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private paginationService = inject(PaginationService);

  private contactsPagination = this.paginationService.createPaginationState<Contact>(
    '/chat/contacts/search',
    20,
    'lastSeen,desc'
  );

  contactsState$ = this.contactsPagination.state$;

  loadContacts(searchTerm: string = ''): Observable<Contact[]> {
    return this.contactsPagination.loadItems(searchTerm);
  }

  loadMoreContacts(): Observable<Contact[]> {
    return this.contactsPagination.loadMoreItems();
  }

  resetContacts(): void {
    this.contactsPagination.reset();
  }

}
