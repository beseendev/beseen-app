import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ToastController } from '@ionic/angular/standalone';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Profile, ProfilePlayerCreationRequest, ProfileScoutCreationRequest } from '../models/profile.model';

export enum FileType {
  PROFILE_IMAGE = 'PROFILE_IMAGE',
  COVER_IMAGE = 'COVER_IMAGE'
}
//... (rest of the file is the same)
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
        this.showToast(response.message || 'Perfil de jogador salvo com sucesso!', 'success');
      })
    );
  }

  createScoutProfile(data: ProfileScoutCreationRequest): Observable<any> {
    return this.apiService.post<any>(`${this.profileEndpoint}/create-scout`, data).pipe(
      tap(response => {
        this.showToast(response.message || 'Perfil de clube salvo com sucesso!', 'success');
      })
    );
  }

  getProfile(userId?: string): Observable<Profile> {
    const endpoint = userId ? `${this.profileEndpoint}/${userId}` : `${this.profileEndpoint}/me/full-profile`;
    return this.apiService.get<Profile>(endpoint);
  }

  getPresignedUrl(data: UploadRequest): Observable<UploadResponse> {
    return this.apiService.post<UploadResponse>(`${this.profileEndpoint}/upload-image`, data);
  }

  uploadImageToS3(url: string, file: Blob, contentType: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': contentType });
    return this.httpClient.put(url, file, { headers, reportProgress: true, observe: 'events' });
  }

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

