import { FileType } from './upload.model';

export interface UserInfo {
  id: string;
  username: string;
  urlPerfil?: string;
}

export interface Post {
  id: string;
  user: UserInfo;
  mediaUrl: string;
  mediaType: FileType;
  caption: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
  inviteStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | null;
  scoutId?: number | null;
  athleteId?: number | null;
}
