export type NotificationType =
  | 'INVITE_RECEIVED'
  | 'CHAT_MESSAGE'
  | 'NO_VIDEO_POSTED'
  | 'INACTIVITY_REMINDER';

export interface NotificationDTO {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  referenceId: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPageResponse {
  items: NotificationDTO[];
  nextCursor?: string | null;
  totalElements: number;
  totalPages: number;
  pageNumber: number;
}
