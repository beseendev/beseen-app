import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Advertisement } from '../models/advertisement.model';

@Injectable({
  providedIn: 'root'
})
export class AdvertisementService {
  private apiService = inject(ApiService);

  getRandomAdvertisement(): Observable<Advertisement> {
    return this.apiService.get<Advertisement>('/v1/advertisements/random');
  }

  getActiveBanners(): Observable<Advertisement[]> {
    return this.apiService.get<Advertisement[]>('/v1/advertisements/banners');
  }
}
