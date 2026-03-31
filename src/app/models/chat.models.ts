import { InviteStatus, ChatMessageResponse, ChatThreadSummaryDTO } from './player-chat.models';

export { InviteStatus, ChatMessageResponse, ChatThreadSummaryDTO };

export type ChatStatus = InviteStatus;

export interface ChatThreadState {
  athleteId: string;
  athleteName: string;
  athleteAvatarUrl?: string | null;
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
  inviteStatus?: InviteStatus | null;
}
