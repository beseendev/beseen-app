export type PlayerChatStatus = 'SEM_CONVITE' | 'CONVITE_RECEBIDO' | 'LIBERADO';

export type PlayerChatSender = 'PLAYER' | 'SCOUT';

export interface PlayerChatMessage {
  id: string;
  sender: PlayerChatSender;
  text: string;
  createdAt: string;
}

export interface PlayerChatThreadState {
  scoutId: string;
  scoutName: string;
  scoutAvatarUrl?: string | null;
  status: PlayerChatStatus;
  messages: PlayerChatMessage[];
  inviteId?: number;
}

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
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export interface PostInvitePageResponse {
  invites: PostInviteResponse[];
  nextCursor: string | null;
}
