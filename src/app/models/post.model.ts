export interface Post {
  id: string;
  user: {
    name: string;
    avatarUrl: string;
  };
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  likes: number;
  comments: number;
  isLiked: boolean;
}
