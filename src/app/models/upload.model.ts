export enum FileType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO'
}

export interface UploadRequest {
  fileName: string;
  contentType: string;
  category: FileType;
  size: number;
}

export interface UploadResponse {
  uploadUrl: string;
  fileId: number;
}
