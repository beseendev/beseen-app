export interface CommentUser {
  username: string;
  urlPerfil?: string | null;
}

export interface CommentResponse {
  id: number;
  profileId: number;
  user: CommentUser;
  content: string;
  createdAt: string;
  isMine: boolean;
}

export interface CommentPage {
  items: CommentResponse[];
  nextCursor: string | null;
}
