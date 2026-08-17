import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { BehaviorSubject, Subscription } from 'rxjs';
import { ApiService } from './api.service';
import { Post, UserInfo } from '../models/post.model';
import { FileType } from '../models/upload.model';
import { Skill } from '../models/skill.model';
import { SkillService } from './skill.service';
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
  user: {
    id?: number;
    username: string;
    urlPerfil?: string;
    position?: string;
  };
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
  /** O backend envia `id` como número; trata-se como Skill (mesmo padrão usado em SkillService). */
  skills?: Skill[];
}

@Injectable({
  providedIn: 'root'
})
export class ScoutSearchService {
  private readonly apiService = inject(ApiService);
  private readonly skillService = inject(SkillService);
  private readonly pageSize = 10;
  private skills: readonly Skill[] = [];

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

  private nextCursor: string | null = null;
  private currentRequestId = 0;
  private activeRequestSub?: Subscription;

  constructor() {
    this.skillService.getSkills().subscribe({
      next: skills => {
        this.skills = skills;
        this.updateFilterSummary(this.currentFilters);
      },
      error: err => console.error('Error loading skills', err)
    });
  }

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
      this.nextCursor = null;
      this.loadingSubject.next(true);
      this.resultsSubject.next([]);
      this.hasMoreSubject.next(false);
    } else {
      this.loadingSubject.next(true);
    }

    const params = this.buildSearchParams(filters, reset ? null : this.nextCursor);

    this.activeRequestSub = this.apiService.get<ScoutPostPageResponseDto>('/posts/search', { params }).subscribe({
      next: response => {
        if (requestId !== this.currentRequestId) return;

        const videosOnly = response.items.filter(post => post.mediaType === FileType.VIDEO);
        const mappedPosts = videosOnly.map(post => this.mapPostResponseToPost(post));
        const current = reset ? [] : this.resultsSubject.value;

        this.resultsSubject.next([...current, ...mappedPosts]);
        this.nextCursor = response.nextCursor;
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

  private buildSearchParams(filters: ScoutVideoFilters, cursor: string | null): HttpParams {
    let params = new HttpParams().set('limit', this.pageSize.toString());

    if (cursor) {
      params = params.set('cursor', cursor);
    }
    if (filters.gender) {
      params = params.set('gender', filters.gender);
    }
    if (filters.minAge != null) {
      params = params.set('minAge', String(filters.minAge));
    }
    if (filters.maxAge != null) {
      params = params.set('maxAge', String(filters.maxAge));
    }
    if (filters.dominantFoot) {
      params = params.set('dominantFoot', filters.dominantFoot);
    }
    for (const position of filters.positions ?? []) {
      params = params.append('positions', position);
    }
    if (filters.estado) {
      params = params.set('estado', filters.estado);
    }
    if (filters.cidade) {
      params = params.set('cidade', filters.cidade);
    }
    if (filters.minHeight != null) {
      params = params.set('minHeight', String(filters.minHeight));
    }
    if (filters.maxHeight != null) {
      params = params.set('maxHeight', String(filters.maxHeight));
    }
    for (const skillId of filters.offensiveSkillIds ?? []) {
      params = params.append('offensiveSkillIds', skillId);
    }
    for (const skillId of filters.defensiveSkillIds ?? []) {
      params = params.append('defensiveSkillIds', skillId);
    }
    if (filters.skillMatchMode) {
      params = params.set('skillMatchMode', filters.skillMatchMode);
    }

    return params;
  }

  private resetSearchState(): void {
    this.activeRequestSub?.unsubscribe();
    this.currentRequestId++;
    this.nextCursor = null;
    this.resultsSubject.next([]);
    this.loadingSubject.next(false);
    this.hasMoreSubject.next(false);
  }

  private updateFilterSummary(filters: ScoutVideoFilters): void {
    this.activeCountSubject.next(countActiveScoutVideoFilters(filters, this.skills));
    this.activeChipsSubject.next(getScoutVideoFilterChips(filters, this.skills));
  }

  private mapPostResponseToPost(postResponse: ScoutPostResponseDto): Post {
    const user: UserInfo = {
      id: String(postResponse.user.id || postResponse.athleteId || ''),
      username: postResponse.user.username,
      urlPerfil: postResponse.user.urlPerfil,
      position: postResponse.user.position || postResponse.position
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
      skills: (postResponse.skills ?? []).map(skill => ({ ...skill, id: String(skill.id) }))
    };
  }
}
