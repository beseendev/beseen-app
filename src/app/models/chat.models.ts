export type ChatStatus = 'BLOQUEADO' | 'AGUARDANDO_CONFIRMACAO' | 'LIBERADO';

export type ChatSender = 'SCOUT' | 'ATHLETE';

export interface ChatMessage {
  id: string;
  sender: ChatSender;
  text: string;
  createdAt: string;
}

export interface ChatThreadState {
  athleteId: string;
  athleteName: string;
  athleteAvatarUrl?: string | null;
  status: ChatStatus;
  messages: ChatMessage[];
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
  inviteStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | null;
}
