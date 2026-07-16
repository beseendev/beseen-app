import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { ApiService } from './api.service';
import { BlockedUsersPageResponse } from '../models/block.model';

@Injectable({
  providedIn: 'root'
})
export class BlockService {
  private apiService = inject(ApiService);
  private readonly blockEndpoint = '/blocks';

  blockUser(profileId: string): Observable<void> {
    return this.apiService.post<void>(this.blockEndpoint, { blockedProfileId: profileId });
  }

  unblockUser(profileId: string): Observable<void> {
    return this.apiService.delete<void>(`${this.blockEndpoint}/${profileId}`);
  }

  getBlockedUsers(page: number = 0, size: number = 10): Observable<BlockedUsersPageResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.apiService.get<BlockedUsersPageResponse>(this.blockEndpoint, { params });
  }
}
