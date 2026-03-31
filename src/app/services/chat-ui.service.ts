import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ChatUiService {
  // Service disabled in favor of real ChatService API integration
  getThreadsSnapshot() { return {}; }
}
