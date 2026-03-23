import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ScoutFavoritesService {
  private readonly storageKey = 'beseen_scout_favorites';

  getFavorites(): string[] {
    const rawFavorites = localStorage.getItem(this.storageKey);
    if (!rawFavorites) {
      return [];
    }

    try {
      const parsedFavorites = JSON.parse(rawFavorites) as string[];
      return Array.isArray(parsedFavorites) ? parsedFavorites : [];
    } catch (error) {
      console.error('Failed to parse scout favorites from local storage', error);
      localStorage.removeItem(this.storageKey);
      return [];
    }
  }

  isFavorite(athleteId: string): boolean {
    return this.getFavorites().includes(athleteId);
  }

  toggleFavorite(athleteId: string): boolean {
    const favorites = this.getFavorites();
    const nextFavorites = favorites.includes(athleteId)
      ? favorites.filter(id => id !== athleteId)
      : [...favorites, athleteId];

    localStorage.setItem(this.storageKey, JSON.stringify(nextFavorites));
    return nextFavorites.includes(athleteId);
  }
}
