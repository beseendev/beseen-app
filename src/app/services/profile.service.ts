import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ToastController } from '@ionic/angular/standalone';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import {
  AthleteSearchParams,
  AthleteSearchResult,
  PageResponse,
  Profile,
  ProfilePlayerCreationRequest, ProfileResponse,
  ProfileScoutCreationRequest
} from '../models/profile.model';
import { FileType, UploadRequest, UploadResponse } from '../models/upload.model';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiService = inject(ApiService);
  private httpClient = inject(HttpClient);
  private toastController = inject(ToastController);
  private readonly profileEndpoint = '/profile';

  createPlayerProfile(data: ProfilePlayerCreationRequest): Observable<any> {
    return this.apiService.post<any>(`${this.profileEndpoint}/player`, data).pipe();
  }

  createScoutProfile(data: ProfileScoutCreationRequest): Observable<any> {
    return this.apiService.post<any>(`${this.profileEndpoint}/scout`, data).pipe();
  }

  updatePlayerProfile(data: Partial<Profile>): Observable<any> {
    return this.apiService.put<any>(`${this.profileEndpoint}/player`, data).pipe();
  }

  updateScoutProfile(data: any): Observable<any> {
    return this.apiService.put<any>(`${this.profileEndpoint}/scout`, data).pipe();
  }

  getProfile(profileId?: string): Observable<Profile> {
    const endpoint = profileId ? `${this.profileEndpoint}/player/full-profile/${profileId}` : `${this.profileEndpoint}/me/full-profile`;
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

  requestAccountDeletion(userId: string | number): Observable<void> {
    return this.apiService.delete<void>(`${this.profileEndpoint}/${userId}`);
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

  searchAthletes(searchParams: AthleteSearchParams): Observable<PageResponse<AthleteSearchResult>> {
    let params = new HttpParams()
      .set('page', String(searchParams.page ?? 0))
      .set('size', String(searchParams.size ?? 20));

    if (searchParams.filter) {
      params = params.set('filter', searchParams.filter);
    }
    if (searchParams.position) {
      params = params.set('position', searchParams.position);
    }
    if (searchParams.dominantFoot) {
      params = params.set('dominantFoot', searchParams.dominantFoot);
    }
    if (searchParams.gender) {
      params = params.set('gender', searchParams.gender);
    }

    return this.apiService.get<PageResponse<AthleteSearchResult>>(
      `${this.profileEndpoint}/search`,
      { params }
    );
  }
}
