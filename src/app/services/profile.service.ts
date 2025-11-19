import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ToastController } from '@ionic/angular/standalone';
import { HttpClient, HttpHeaders } from '@angular/common/http';

// Matches the backend DTO
export interface ProfilePlayerCreationRequest {
  bio?: string;
  position?: string;
  height?: string;
  weight?: string;
  careerHistory?: string;
  documentNumber: string;
  phoneNumber: string;
  dateOfBirth: string; // Format dd/MM/yyyy
  role: string;
}

// Matches the backend enum
export enum FileType {
  PROFILE_IMAGE = 'PROFILE_IMAGE',
  COVER_IMAGE = 'COVER_IMAGE'
}

// Matches the backend DTO
export interface UploadRequest {
  fileName: string;
  contentType: string;
  category: FileType;
  size: number;
}

// Matches the backend DTO
export interface UploadResponse {
  uploadUrl: string;
  fileId: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiService = inject(ApiService);
  private httpClient = inject(HttpClient);
  private toastController = inject(ToastController);
  private readonly profileEndpoint = '/profile';

  createPlayerProfile(data: ProfilePlayerCreationRequest): Observable<any> {
    return this.apiService.post<any>(`${this.profileEndpoint}/create-player`, data).pipe(
      tap(response => {
        this.showToast(response.message || 'Perfil salvo com sucesso!', 'success');
      })
    );
  }

  // Step 1: Get pre-signed URL from your backend
  getPresignedUrl(data: UploadRequest): Observable<UploadResponse> {
    return this.apiService.post<UploadResponse>(`${this.profileEndpoint}/upload-image`, data);
  }

  // Step 2: Upload the actual file to S3 using the pre-signed URL
  uploadImageToS3(url: string, file: Blob, contentType: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': contentType });
    return this.httpClient.put(url, file, { headers, reportProgress: true, observe: 'events' });
  }

  // Step 3: Notify your backend that the upload is complete
  notifyUploadComplete(): Observable<any> {
    return this.apiService.put<any>(`${this.profileEndpoint}/send-files`, {});
  }

  private async showToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'top'
    });
    toast.present();
  }
}
