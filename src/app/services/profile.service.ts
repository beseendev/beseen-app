import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ToastController } from '@ionic/angular/standalone';

export interface ProfilePlayerCreationRequest {
  bio?: string;
  position?: string;
  height?: string;
  weight?: string;
  careerHistory?: string;
  documentNumber: string;
  phoneNumber: string;
  dateOfBirth: string; // Formato dd/MM/yyyy
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiService = inject(ApiService);
  private toastController = inject(ToastController);
  private readonly profileEndpoint = '/profile';

  createPlayerProfile(data: ProfilePlayerCreationRequest): Observable<any> {
    return this.apiService.post<any>(`${this.profileEndpoint}/create-player`, data).pipe(
      tap(response => {
        this.showToast(response.message || 'Perfil criado com sucesso!', 'success');
      })
    );
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
