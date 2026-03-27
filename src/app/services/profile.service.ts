import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {map, tap} from 'rxjs/operators';
import { ApiService } from './api.service';
import { ToastController } from '@ionic/angular/standalone';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import {
  PageResponse,
  Profile,
  ProfilePlayerCreationRequest, ProfileResponse,
  ProfileScoutCreationRequest
} from '../models/profile.model';

export enum FileType {
  PROFILE_IMAGE = 'PROFILE_IMAGE',
  COVER_IMAGE = 'COVER_IMAGE'
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
        this.showToast(response.message || 'Perfil de olheiro salvo com sucesso!', 'success');
      })
    );
  }

  updatePlayerProfile(data: Partial<Profile>): Observable<any> {
    return this.apiService.put<any>(`${this.profileEndpoint}/update-player`, data).pipe(
      tap(response => {
        this.showToast(response.message || 'Perfil atualizado com sucesso!', 'success');
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

  searchProfiles(query: string, page: number = 0, size: number = 20): Observable<ProfileResponse[]> {
    let params = new HttpParams()
      .set('filter', query)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.apiService.get<PageResponse<ProfileResponse>>(
      `${this.profileEndpoint}/search`,
      { params }
    ).pipe(
      map(response => response.content)
    );
  }
}
