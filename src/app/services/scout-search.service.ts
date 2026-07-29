import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { BehaviorSubject, Subscription } from 'rxjs';
import { ApiService } from './api.service';
import { Post, UserInfo } from '../models/post.model';
import { FileType } from '../models/upload.model';
import { SKILL_CATALOG, Skill } from '../models/skill.model';
import {
  ScoutVideoFilterChip,
  ScoutVideoFilters,
  countActiveScoutVideoFilters,
  getScoutVideoFilterChips,
  hasActiveScoutVideoFilters,
  normalizeScoutVideoFilters
} from '../models/scout-search.model';

interface ScoutPostPageResponseDto {
  items: ScoutPostResponseDto[];
  nextCursor: string | null;
}

interface ScoutPostResponseDto {
  id: number;
  user: ScoutPostUserDto;
  mediaUrl: string;
  mediaType: FileType;
  caption: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
  position?: string;
  inviteStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | null;
  scoutId?: number | null;
  athleteId?: number | null;
  skills?: Skill[] | null;
}

interface ScoutPostUserDto {
  id?: number;
  username: string;
  urlPerfil?: string;
  position?: string;
  posicao?: string;
  cargoOuFuncao?: string;
  modality?: string;
  modalidade?: string;
  region?: string;
  cidade?: string;
  estado?: string;
  dateOfBirth?: string;
  height?: string;
  dominantFoot?: 'RIGHT' | 'LEFT' | 'BOTH';
  gender?: 'MALE' | 'FEMALE' | null;
}

type ScoutPostUserInfo = UserInfo & {
  posicao?: string;
  cargoOuFuncao?: string;
  modality?: string;
  modalidade?: string;
  region?: string;
  cidade?: string;
  estado?: string;
};

@Injectable({
  providedIn: 'root'
})
export class ScoutSearchService {
  private readonly apiService = inject(ApiService);
  private readonly pageSize = 10;

  private readonly filtersSubject = new BehaviorSubject<ScoutVideoFilters>(normalizeScoutVideoFilters(null));
  readonly filters$ = this.filtersSubject.asObservable();

  private readonly resultsSubject = new BehaviorSubject<Post[]>([]);
  readonly results$ = this.resultsSubject.asObservable();

  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();

  private readonly hasMoreSubject = new BehaviorSubject<boolean>(false);
  readonly hasMore$ = this.hasMoreSubject.asObservable();

  private readonly activeCountSubject = new BehaviorSubject<number>(0);
  readonly activeCount$ = this.activeCountSubject.asObservable();

  private readonly activeChipsSubject = new BehaviorSubject<ScoutVideoFilterChip[]>([]);
  readonly activeChips$ = this.activeChipsSubject.asObservable();

  private currentPage = 0;
  private nextCursor: string | null = null;
  private currentRequestId = 0;
  private activeRequestSub?: Subscription;

  get currentFilters(): ScoutVideoFilters {
    return this.filtersSubject.value;
  }

  get currentResults(): Post[] {
    return this.resultsSubject.value;
  }

  get hasActiveFilters(): boolean {
    return hasActiveScoutVideoFilters(this.currentFilters);
  }

  applyFilters(filters: ScoutVideoFilters): void {
    const normalized = normalizeScoutVideoFilters(filters);
    this.filtersSubject.next(normalized);
    this.updateFilterSummary(normalized);

    if (!hasActiveScoutVideoFilters(normalized)) {
      this.resetSearchState();
      return;
    }

    this.searchVideos(normalized, true);
  }

  clearFilters(): void {
    this.applyFilters(normalizeScoutVideoFilters(null));
  }

  reload(): void {
    if (this.hasActiveFilters) {
      this.searchVideos(this.currentFilters, true);
    }
  }

  loadMore(): void {
    if (!this.hasActiveFilters || this.loadingSubject.value || !this.hasMoreSubject.value) {
      return;
    }

    this.searchVideos(this.currentFilters, false);
  }

  updatePostFavoriteState(postId: string, isLiked: boolean): void {
    const updated = this.resultsSubject.value.map(post => {
      if (post.id !== postId) return post;
      const likesDelta = isLiked && !post.isLiked ? 1 : !isLiked && post.isLiked ? -1 : 0;
      return {
        ...post,
        isLiked,
        likesCount: Math.max(0, post.likesCount + likesDelta)
      };
    });

    this.resultsSubject.next(updated);
  }

  updatePostInviteState(postId: string, inviteStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED' | null): void {
    const updated = this.resultsSubject.value.map(post =>
      post.id === postId ? { ...post, inviteStatus } : post
    );
    this.resultsSubject.next(updated);
  }

  private searchVideos(filters: ScoutVideoFilters, reset: boolean): void {
    const requestId = ++this.currentRequestId;

    if (reset) {
      this.activeRequestSub?.unsubscribe();
      this.currentPage = 0;
      this.nextCursor = null;
      this.loadingSubject.next(true);
      this.resultsSubject.next([]);
      this.hasMoreSubject.next(false);
    } else {
      this.loadingSubject.next(true);
    }

    // Temporary fallback until the backend exposes the scouting search endpoint.
    // This request intentionally does not use PostService.homePosts$ and does not
    // write filtered results into the shared home feed.
    let params = new HttpParams().set('limit', this.pageSize.toString());
    if (this.nextCursor && !reset) {
      params = params.set('cursor', this.nextCursor);
    }

    this.activeRequestSub = this.apiService.get<ScoutPostPageResponseDto>('/posts', { params }).subscribe({
      next: response => {
        if (requestId !== this.currentRequestId) return;

        const filteredDtos = response.items
          .filter(post => post.mediaType === FileType.VIDEO)
          .filter(post => this.matchesTemporaryFallbackFilters(post, filters));
        const mappedPosts = filteredDtos.map(post => this.mapPostResponseToPost(post));
        const current = reset ? [] : this.resultsSubject.value;

        this.resultsSubject.next([...current, ...mappedPosts]);
        this.nextCursor = response.nextCursor;
        this.currentPage++;
        this.hasMoreSubject.next(!!response.nextCursor);
        this.loadingSubject.next(false);
      },
      error: err => {
        if (requestId !== this.currentRequestId) return;
        console.error('Error loading scout search videos', err);
        this.loadingSubject.next(false);
        this.hasMoreSubject.next(false);
      }
    });
  }

  private resetSearchState(): void {
    this.activeRequestSub?.unsubscribe();
    this.currentRequestId++;
    this.currentPage = 0;
    this.nextCursor = null;
    this.resultsSubject.next([]);
    this.loadingSubject.next(false);
    this.hasMoreSubject.next(false);
  }

  private updateFilterSummary(filters: ScoutVideoFilters): void {
    this.activeCountSubject.next(countActiveScoutVideoFilters(filters, SKILL_CATALOG));
    this.activeChipsSubject.next(getScoutVideoFilterChips(filters, SKILL_CATALOG));
  }

  private mapPostResponseToPost(postResponse: ScoutPostResponseDto): Post {
    const user: ScoutPostUserInfo = {
      id: String(postResponse.user.id || postResponse.athleteId || ''),
      username: postResponse.user.username,
      urlPerfil: postResponse.user.urlPerfil,
      position: postResponse.user.position || postResponse.position,
      posicao: postResponse.user.posicao,
      cargoOuFuncao: postResponse.user.cargoOuFuncao,
      modality: postResponse.user.modality,
      modalidade: postResponse.user.modalidade,
      region: postResponse.user.region,
      cidade: postResponse.user.cidade,
      estado: postResponse.user.estado
    };

    return {
      id: String(postResponse.id),
      user,
      mediaUrl: postResponse.mediaUrl,
      mediaType: postResponse.mediaType,
      caption: postResponse.caption,
      likesCount: postResponse.likesCount,
      commentsCount: postResponse.commentsCount,
      isLiked: postResponse.isLiked,
      createdAt: postResponse.createdAt,
      position: postResponse.position || postResponse.user.position,
      inviteStatus: postResponse.inviteStatus,
      scoutId: postResponse.scoutId,
      athleteId: postResponse.athleteId,
      skills: postResponse.skills ?? null
    };
  }

  private matchesTemporaryFallbackFilters(post: ScoutPostResponseDto, filters: ScoutVideoFilters): boolean {
    const normalized = normalizeScoutVideoFilters(filters);

    if (normalized.gender && post.user.gender !== normalized.gender) return false;

    const age = this.calculateAge(post.user.dateOfBirth);
    if (normalized.minAge != null && (age == null || age < normalized.minAge)) return false;
    if (normalized.maxAge != null && (age == null || age > normalized.maxAge)) return false;

    if (normalized.dominantFoot && post.user.dominantFoot !== normalized.dominantFoot) return false;

    const position = post.user.position || post.position || post.user.posicao || post.user.cargoOuFuncao;
    if ((normalized.positions ?? []).length > 0 && (!position || !normalized.positions?.includes(position))) return false;

    const height = this.parseHeight(post.user.height);
    if (normalized.minHeight != null && (height == null || height < normalized.minHeight)) return false;
    if (normalized.maxHeight != null && (height == null || height > normalized.maxHeight)) return false;

    if (normalized.estado && post.user.estado !== normalized.estado) return false;

    if (normalized.cidade) {
      const cidade = (post.user.cidade || post.user.region || '').toLocaleLowerCase();
      if (!cidade.includes(normalized.cidade.toLocaleLowerCase())) return false;
    }

    return this.matchesSkills(post.skills ?? [], normalized);
  }

  private matchesSkills(skills: readonly Skill[], filters: ScoutVideoFilters): boolean {
    const selectedSkillIds = [
      ...(filters.offensiveSkillIds ?? []),
      ...(filters.defensiveSkillIds ?? [])
    ];

    if (selectedSkillIds.length === 0) return true;

    const postSkillIds = new Set<string>();
    for (const skill of skills) {
      postSkillIds.add(skill.id);
      postSkillIds.add(skill.code);
    }

    if (filters.skillMatchMode === 'ALL') {
      return selectedSkillIds.every(skillId => postSkillIds.has(skillId));
    }

    return selectedSkillIds.some(skillId => postSkillIds.has(skillId));
  }

  private calculateAge(dateOfBirth: string | null | undefined): number | null {
    const birthDate = this.parseDate(dateOfBirth);
    if (!birthDate) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age >= 0 ? age : null;
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [day, month, year] = value.split('/').map(Number);
      return new Date(year, month - 1, day);
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseHeight(value: string | null | undefined): number | null {
    if (!value) return null;
    const parsed = Number(value.replace(',', '.').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
}
