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
  private authService = inject(AuthService); // Inject AuthService if direct token handling is needed

  constructor() { }

  /**
   * Orchestrates the entire post creation process:
   * 1. Gets a pre-signed URL from the backend.
   * 2. Uploads the file directly to AWS S3 using the pre-signed URL.
   * 3. Creates the post record in the backend using the fileId.
   * 4. Updates the file status in the backend to 'SENT'.
   * @param file The File object to upload.
   * @param caption The caption for the post.
   * @returns An Observable of the created Post object.
   */
  uploadAndCreatePost(file: File, caption: string): Observable<Post> {
    const fileType = file.type.startsWith('image/') ? FileType.IMAGE : FileType.VIDEO;
    let currentFileId: number; // To hold the fileId for error handling

    // Step 1: Get a pre-signed URL
    return this.getPresignedUploadUrl({
      fileName: file.name,
      contentType: file.type,
      category: fileType,
      size: file.size
    }).pipe(
      tap(uploadResponse => currentFileId = uploadResponse.fileId), // Store fileId for potential error handling
      // Step 2: Upload file to AWS S3
      switchMap(uploadResponse => this.uploadFileToS3(uploadResponse.uploadUrl, file).pipe(
        map(() => uploadResponse) // Pass uploadResponse to the next step
      )),
      // Step 3: Create post record in backend
      switchMap(uploadResponse => this.createPostRecord({
        fileId: uploadResponse.fileId,
        caption: caption
      })),
      // Step 4: Update file status to SENT
      switchMap(createdPost => this.updateBackendFileStatus(currentFileId, StatusFile.SENT).pipe( // Use currentFileId (number)
        map(() => createdPost) // Return the created post
      )),
      catchError(error => {
        console.error('Error during upload and post creation:', error);
        // If an error occurs, try to update file status to ERROR if fileId is available
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
    // Add token if not handled by an HttpInterceptor globally
    // const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    return this.http.post<UploadResponse>(`${this.baseUrl}/posts/upload-url-post`, request);
  }

  private uploadFileToS3(uploadUrl: string, file: File): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': file.type
    });
    // Use reportProgress and observe 'events' to get progress updates
    return this.http.put(uploadUrl, file, { headers, reportProgress: true, observe: 'events' }).pipe(
      map(event => {
        // You can handle progress events here if needed
        // if (event.type === HttpEventType.UploadProgress) {
        //   const percentDone = Math.round(100 * event.loaded / event.total);
        //   console.log(`File is ${percentDone}% uploaded.`);
        // }
        // When upload is complete, event.type will be HttpEventType.Response
        return event;
      }),
      filter(event => event.type === HttpEventType.Response), // Only interested in the final response
      map(event => event.body), // Return the response body
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
