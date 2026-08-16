export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface ProfileSummaryResponse {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  urlProfileImage?: string | null;
}

export interface InviteResponse {
  id: number;
  postId?: number | null;
  scoutProfile: ProfileSummaryResponse;
  playerProfile: ProfileSummaryResponse;
  status: InviteStatus;
  createdAt: string;
  chatThreadId?: number | null;
}

export interface InvitePageResponse {
  items: InviteResponse[];
  nextCursor?: string | null;
  totalElements: number;
  totalPages: number;
  pageNumber: number;
}

export interface ChatThreadSummaryDTO {
  inviteId: number;
  chatThreadId: number | null;
  counterpartProfileId?: string | number | null;
  counterpartRole?: string | null;
  counterpartName: string;
  counterpartAvatar: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  status: InviteStatus;
  unreadCount: number;
  /** Indica se o usuário logado bloqueou o outro participante (retornado pelo backend). */
  counterpartBlocked?: boolean;
  counterpartAta?: number | null;
  counterpartDef?: number | null;
  counterpartHab?: number | null;
  counterpartForca?: number | null;
}

export interface ChatThreadPageResponse {
  items: ChatThreadSummaryDTO[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
}

export interface ChatMessageResponse {
  id: number;
  senderId: number;
  text: string;
  isMine: boolean;
  createdAt: string;
}

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
  position?: string;
  localidade: string;
  destaque: string;
  favorito: boolean;
  likes?: number;
  inviteStatus?: InviteStatus | null;
  isInviting?: boolean;
}
