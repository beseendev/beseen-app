export enum FileType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  PROFILE_IMAGE = 'PROFILE_IMAGE',
  COVER_IMAGE = 'COVER_IMAGE'
}

export interface UploadRequest {
  fileName: string;
  contentType: string;
  category: FileType;
  size: number;
  duration?: number;
}

export interface UploadResponse {
  uploadUrl: string;
  fileId: number;
}
