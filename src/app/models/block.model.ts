export type BlockedUserRole = 'JOGADOR' | 'CLUBE';

export interface BlockedUser {
  profileId: string;
  name: string;
  avatarUrl?: string | null;
  role: BlockedUserRole;
  blockedAt?: string;
}

export interface BlockedUsersPageResponse {
  items: BlockedUser[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
}
