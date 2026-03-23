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
}
