import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEventType } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, switchMap, tap, filter } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { FileType, UploadRequest, UploadResponse } from '../models/upload.model';
import { PostCreationRequest } from '../models/post-creation.model';
import { StatusFile, FileStatusUpdateRequest } from '../models/file-status.model';
import { Post } from '../models/post.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UploadPostService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  constructor() { }

  uploadAndCreatePost(file: File, caption: string): Observable<Post> {
    const fileType = file.type.startsWith('image/') ? FileType.IMAGE : FileType.VIDEO;
    let currentFileId: number;

    return this.getPresignedUploadUrl({
      fileName: file.name,
      contentType: file.type,
      category: fileType,
      size: file.size
    }).pipe(
      tap(uploadResponse => currentFileId = uploadResponse.fileId),
      switchMap(uploadResponse => this.uploadFileToS3(uploadResponse.uploadUrl, file).pipe(
        map(() => uploadResponse)
      )),
      switchMap(uploadResponse => this.createPostRecord({
        fileId: uploadResponse.fileId,
        caption: caption
      })),
      switchMap(createdPost => this.updateBackendFileStatus(currentFileId, StatusFile.SENT).pipe( // Use currentFileId (number)
        map(() => createdPost)
      )),
      catchError(error => {
        console.error('Error during upload and post creation:', error);
        if (currentFileId) {
          this.updateBackendFileStatus(currentFileId, StatusFile.ERROR).subscribe({
            next: () => console.log(`File ${currentFileId} status updated to ERROR.`),
            error: err => console.error(`Failed to update file ${currentFileId} status to ERROR:`, err)
          });
        }
        return throwError(() => new Error('Falha ao enviar e criar o post.'));
      })
    );
  }

  private getPresignedUploadUrl(request: UploadRequest): Observable<UploadResponse> {
    return this.http.post<UploadResponse>(`${this.baseUrl}/posts/upload-url-post`, request);
  }

  private uploadFileToS3(uploadUrl: string, file: File): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': file.type
    });
    return this.http.put(uploadUrl, file, { headers, reportProgress: true, observe: 'events' }).pipe(
      map(event => {
        return event;
      }),
      filter(event => event.type === HttpEventType.Response),
      map(event => event.body),
      catchError(error => {
        console.error('Error uploading file to S3:', error);
        return throwError(() => new Error('Falha ao fazer upload para S3.'));
      })
    );
  }

  private createPostRecord(request: PostCreationRequest): Observable<Post> {
    return this.http.post<Post>(`${this.baseUrl}/posts`, request);
  }

  private updateBackendFileStatus(fileId: number, status: StatusFile): Observable<void> { // fileId is number
    const requestBody: FileStatusUpdateRequest = { status };
    return this.http.put<void>(`${this.baseUrl}/posts/${fileId}/status`, requestBody);
  }
}
