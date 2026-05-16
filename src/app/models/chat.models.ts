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
  items: PostInviteResponse[];
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

export type ChatStatus = InviteStatus;

/**
 * Legacy state interfaces for UI compatibility.
 * Prefer using ChatThreadSummaryDTO and ChatMessageResponse for new features.
 */
export interface ChatThreadState {
  athleteId: string;
  athleteName: string;
  athleteAvatarUrl?: string | null;
  status: InviteStatus;
  messages: ChatMessageResponse[];
  inviteId: number;
  chatThreadId?: number;
}

export interface PlayerChatThreadState {
  scoutId: string;
  scoutName: string;
  scoutAvatarUrl?: string | null;
  status: InviteStatus;
  messages: ChatMessageResponse[];
  inviteId: number;
  chatThreadId?: number;
}

export interface FavoriteAthleteVideoCard {
  postId: string;
  athleteId: string;
  athleteName: string;
  athleteAvatarUrl?: string | null;
  mediaUrl: string;
  caption: string;
  modalidade: string;
  localidade: string;
  destaque: string;
  favorito: boolean;
  likes?: number;
  inviteStatus?: InviteStatus | null;
  isInviting?: boolean;
}
