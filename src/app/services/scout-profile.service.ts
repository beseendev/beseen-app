import { Injectable } from '@angular/core';
import { ScoutProfile } from '../models/scout-profile.model';

@Injectable({
  providedIn: 'root'
})
export class ScoutProfileService {
  private readonly storageKey = 'beseen_scout_profile';
  private cachedProfile: ScoutProfile | null = null;

  async getProfile(): Promise<ScoutProfile | null> {
    if (this.cachedProfile) {
      return this.cachedProfile;
    }

    const rawProfile = localStorage.getItem(this.storageKey);
    if (!rawProfile) {
      return null;
    }

    try {
      const parsedProfile = JSON.parse(rawProfile) as ScoutProfile;
      this.cachedProfile = parsedProfile;
      return parsedProfile;
    } catch (error) {
      console.error('Failed to parse scout profile from local storage', error);
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  async saveProfile(profile: ScoutProfile): Promise<void> {
    this.cachedProfile = profile;
    localStorage.setItem(this.storageKey, JSON.stringify(profile));
  }

  async clearProfile(): Promise<void> {
    this.cachedProfile = null;
    localStorage.removeItem(this.storageKey);
  }
}
