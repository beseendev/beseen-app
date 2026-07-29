import { FileType } from './upload.model';
import { Skill } from './skill.model';

export interface UserInfo {
  id: string;
  username: string;
  urlPerfil?: string;
  position?: string;
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
  position?: string;
  inviteStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | null;
  scoutId?: number | null;
  athleteId?: number | null;
  skills?: Skill[] | null;
}
