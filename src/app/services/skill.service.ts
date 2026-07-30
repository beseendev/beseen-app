import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { map, Observable, shareReplay } from 'rxjs';
import { ApiService } from './api.service';
import { Skill, SkillType } from '../models/skill.model';

@Injectable({
  providedIn: 'root'
})
export class SkillService {
  private readonly apiService = inject(ApiService);
  private readonly cache = new Map<string, Observable<Skill[]>>();

  getSkills(type?: SkillType): Observable<Skill[]> {
    const cacheKey = type ?? 'ALL';

    if (!this.cache.has(cacheKey)) {
      let params = new HttpParams();
      if (type) {
        params = params.set('type', type);
      }

      this.cache.set(
        cacheKey,
        this.apiService.get<Skill[]>('/skills', { params }).pipe(
          map(skills => skills.map(skill => ({ ...skill, id: String(skill.id) }))),
          shareReplay(1)
        )
      );
    }

    return this.cache.get(cacheKey)!;
  }
}
