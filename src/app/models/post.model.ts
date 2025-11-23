import { FileType } from './upload.model'; // Import FileType enum

export interface UserInfo { // Consistent with backend UserResponse/ProfilePlayerDTO
  id: string; // Assuming user ID is also a string on frontend
  username: string;
  urlPerfil?: string; // Optional profile picture URL
}

export interface Post {
  id: string; // Convert Long from backend to string for frontend
  user: UserInfo; // Use the new UserInfo interface
  mediaUrl: string;
  mediaType: FileType; // Use the imported FileType enum
  caption: string;
  likesCount: number; // Match backend naming for clarity
  commentsCount: number; // Match backend naming for clarity
  isLiked: boolean;
  createdAt: string; // Add createdAt from backend (LocalDateTime usually maps to string)
}