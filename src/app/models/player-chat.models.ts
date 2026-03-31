export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface ProfileSummaryResponse {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  urlProfileImage?: string | null;
}

export interface PostInviteResponse {
  id: number;
  postId: number;
  scoutProfile: ProfileSummaryResponse;
  playerProfile: ProfileSummaryResponse;
  status: InviteStatus;
  createdAt: string;
  chatThreadId?: number | null;
}

export interface PostInvitePageResponse {
  invites: PostInviteResponse[];
  nextCursor: string | null;
}

export interface ChatThreadSummaryDTO {
  inviteId: number;
  chatThreadId: number | null;
  counterpartName: string;
  counterpartAvatar: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  status: InviteStatus;
  unreadCount: number;
}

export interface ChatMessageResponse {
  id: number;
  senderId: number;
  text: string;
  isMine: boolean;
  createdAt: string;
}

// Keeping for compatibility with some UI components that might still use this structure
// but we will transition them to the DTOs above.
export interface PlayerChatThreadState {
  scoutId: string;
  scoutName: string;
  scoutAvatarUrl?: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  messages: ChatMessageResponse[];
  inviteId: number;
  chatThreadId?: number;
}
