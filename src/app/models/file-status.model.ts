export enum StatusFile {
  NOT_SENT = 'NOT_SENT',
  SENT = 'SENT',
  ERROR = 'ERROR',
  PENDING = 'PENDING'
}

export interface FileStatusUpdateRequest {
  status: StatusFile;
}
