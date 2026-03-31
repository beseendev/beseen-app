import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonContent, IonAvatar, IonLabel, IonGrid, IonRow, IonCol, IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonList, IonText, IonSegment, IonSegmentButton, IonInput, IonTextarea, ToastController, IonSelect, IonSelectOption, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, createOutline, personAddOutline, chatbubbleOutline, personCircleOutline, briefcaseOutline, calendarOutline, bodyOutline, resizeOutline, scaleOutline, informationCircleOutline, timeOutline, imageOutline, videocamOutline, checkmarkOutline, closeOutline } from 'ionicons/icons';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileService } from '../services/profile.service';
import { PostService } from '../services/post.service';
import { Profile } from '../models/profile.model';
import { Post } from '../models/post.model';
import { FileType } from '../models/upload.model'; // Added FileType import
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { switchMap, tap, map, filter, finalize } from 'rxjs/operators';
import { PostCardComponent } from '../components/post-card/post-card.component';
import { AuthService } from '../services/auth.service';
import { catchError, of } from 'rxjs';
import { SCOUT_POSITION_OPTIONS } from '../models/scout-profile.model';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-profile-player',
  templateUrl: './profile-player.page.html',
  styleUrls: ['./profile-player.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonContent,
    IonAvatar,
    IonLabel,
    IonGrid,
    IonRow,
    IonCol,
    IonRefresher,
    IonRefresherContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonList,
    IonText,
    IonSegment,
    IonSegmentButton,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    PostCardComponent
  ],
})
export class ProfilePlayerPage implements OnInit {
  private readonly LOCAL_PROFILE_STORAGE_KEY = 'beseen-player-profile-overrides';
  profileId: string | null = null;
  profile: Profile | null = null;
  isMyProfile = false;
  isEditing = false;
  selectedSegment: 'images' | 'videos' = 'images';
  draftProfile: Partial<Profile> = {};
  isLoading = false;
  private readonly DEFAULT_POST_LIMIT = 10;
  readonly positionOptions = SCOUT_POSITION_OPTIONS;

  private profileService = inject(ProfileService);
  private postService = inject(PostService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private toastController = inject(ToastController);

  private userPostsSubject = new BehaviorSubject<Post[]>([]);
  private selectedSegmentSubject = new BehaviorSubject<'images' | 'videos'>('images');
  filteredUserPosts$: Observable<Post[]>;
  private userPostsCurrentCursor: string | undefined;
  private userPostsHasMore = true;

  constructor() {
    addIcons({ arrowBackOutline, createOutline, personAddOutline, chatbubbleOutline, personCircleOutline, briefcaseOutline, calendarOutline, bodyOutline, resizeOutline, scaleOutline, informationCircleOutline, timeOutline, imageOutline, videocamOutline, checkmarkOutline, closeOutline });

    this.filteredUserPosts$ = combineLatest([
      this.userPostsSubject.asObservable(),
      this.selectedSegmentSubject.asObservable()
    ]).pipe(
      map(([posts, segment]) => posts.filter(post => {
        if (segment === 'images') {
          return post.mediaType === FileType.IMAGE;
        } else if (segment === 'videos') {
          return post.mediaType === FileType.VIDEO;
        }
        return true;
      }))
    );
  }

  ngOnInit() {
    this.activatedRoute.paramMap.pipe(
      switchMap(params => {
        this.profileId = params.get('userId');
        return this.authService.getCurrentUser().pipe(
          filter(user => !!user),
          map(user => user.id),
          tap(currentUserId => {
            this.isMyProfile = !this.profileId || this.profileId === currentUserId;
          }),
          switchMap(() => this.profileService.getProfile(this.profileId ?? undefined).pipe(
            catchError(() => of(this.getMockProfile(this.profileId)))
          ))
        );
      }),
      tap(profile => {
        this.profile = this.applyLocalOverrides(profile);
        if (this.profile) {
          const rawAvatar = this.profile.urlProfileImage || this.profile.urlPerfil || null;
          this.profile.urlProfileImage = this.normalizeAvatarUrl(rawAvatar);
        }
        if (!this.profileId && profile) {
          this.profileId = profile?.id;
        }
        this.syncDraftProfile();
        this.resetAndLoadUserPosts();
      })
    ).subscribe();
  }

  private normalizeAvatarUrl(rawUrl: string | null | undefined): string | null {
    if (!rawUrl) {
      return null;
    }

    const url = rawUrl.trim();
    if (!url) {
      return null;
    }

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }

    if (url.startsWith('//')) {
      return `https:${url}`;
    }

    const baseApiUrl = environment.apiUrl;
    if (url.startsWith('/') && baseApiUrl) {
      const baseOrigin = baseApiUrl.replace(/\/beseen\/api$/, '');
      return `${baseOrigin}${url}`;
    }

    return baseApiUrl ? `${baseApiUrl}/${url.replace(/^\/+/, '')}` : url;
  }

  segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
    this.selectedSegmentSubject.next(this.selectedSegment);
  }

  goBack() {
    this.router.navigateByUrl('/player-home');
  }

  goToSettings() {
    console.log('Go to settings');
  }

  startEditing(): void {
    if (!this.isMyProfile || !this.profile) {
      return;
    }

    this.isEditing = true;
    this.syncDraftProfile();
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.syncDraftProfile();
  }

  async saveProfileEdits(): Promise<void> {
    if (!this.profile) {
      return;
    }

    this.isLoading = true;
    const updateData: Partial<Profile> = {
      bio: (this.draftProfile.bio || '').trim(),
      position: (this.draftProfile.position || '').trim(),
      height: (this.draftProfile.height || '').trim(),
      weight: (this.draftProfile.weight || '').trim(),
      careerHistory: (this.draftProfile.careerHistory || '').trim(),
    };

    this.profileService.updatePlayerProfile(updateData).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: () => {
        const mergedProfile: Profile = {
          ...this.profile!,
          ...updateData
        };

        this.profile = mergedProfile;
        this.persistLocalOverrides(mergedProfile);
        this.isEditing = false;
      },
      error: (err) => {
        console.error('Failed to update profile in API', err);
      }
    });
  }

  followUser() {
    console.log('Follow user', this.profile?.name);
  }

  startChat() {
    console.log('Start chat with', this.profile?.name);
  }

  onNumericInput(event: any, field: 'height' | 'weight') {
    const rawValue = event.target.value || '';
    const cleaned = rawValue.replace(/[^0-9.,]/g, '').replace(/,/g, '.');
    const parts = cleaned.split('.');
    const finalValue = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;

    this.draftProfile[field] = finalValue;
    event.target.value = finalValue;
  }

  async loadMoreUserPosts(event: any) {
    if (!this.userPostsHasMore || !this.profileId) {
      event.target.complete();
      event.target.disabled = true;
      return;
    }

    this.postService.getPostsForAuthenticatedUser(this.DEFAULT_POST_LIMIT, this.userPostsCurrentCursor).subscribe({
      next: response => {
        const newPosts = response.posts;
        this.userPostsSubject.next([...this.userPostsSubject.getValue(), ...newPosts]);
        this.userPostsCurrentCursor = response.nextCursor || undefined;
        this.userPostsHasMore = !!response.nextCursor && newPosts.length >= this.DEFAULT_POST_LIMIT;
        
        event.target.complete();
        if (!this.userPostsHasMore) {
          event.target.disabled = true;
        }
      },
      error: err => {
        console.error('Error loading more user posts', err);
        event.target.complete();
      }
    });
  }

  async refreshUserPosts(event: any) {
    this.resetAndLoadUserPosts();
    event.target.complete();
  }

  private resetAndLoadUserPosts() {
    this.userPostsSubject.next([]);
    this.userPostsCurrentCursor = undefined;
    this.userPostsHasMore = true;

    // Reset infinite scroll if possible
    const infiniteScroll = document.querySelector('ion-infinite-scroll');
    if (infiniteScroll) {
      (infiniteScroll as any).disabled = false;
    }

    if (this.profileId && !this.isMyProfile) {
      const mockPosts = this.getMockPostsForProfile(this.profileId);
      this.userPostsSubject.next(mockPosts);
      this.userPostsHasMore = false;
      if (infiniteScroll) {
        (infiniteScroll as any).disabled = true;
      }
      return;
    }

    if (this.profileId) {
      this.postService.getPostsForAuthenticatedUser(this.DEFAULT_POST_LIMIT, this.userPostsCurrentCursor).subscribe({
        next: response => {
          this.userPostsSubject.next(response.posts);
          this.userPostsCurrentCursor = response.nextCursor || undefined;
          this.userPostsHasMore = !!response.nextCursor && response.posts.length >= this.DEFAULT_POST_LIMIT;
          
          if (!this.userPostsHasMore && infiniteScroll) {
            (infiniteScroll as any).disabled = true;
          }
        },
        error: err => {
          console.error('Error refreshing user posts', err);
        }
      });
    }
  }

  trackById(index: number, post: Post): string {
    return post.id;
  }

  getDisplayRole(role: Profile['role'] | undefined): string {
    if (role === 'CLUBE') {
      return 'OLHEIRO';
    }

    return role ?? '';
  }

  private syncDraftProfile(): void {
    if (!this.profile) {
      this.draftProfile = {};
      return;
    }

    this.draftProfile = {
      fullName: this.profile.fullName,
      bio: this.profile.bio ?? '',
      position: this.profile.position ?? '',
      height: this.profile.height ?? '',
      weight: this.profile.weight ?? '',
      careerHistory: this.profile.careerHistory ?? '',
    };
  }

  private applyLocalOverrides(profile: Profile | null): Profile | null {
    if (!profile || !this.isMyProfile) {
      return profile;
    }

    try {
      const rawValue = localStorage.getItem(this.LOCAL_PROFILE_STORAGE_KEY);
      if (!rawValue) {
        return profile;
      }

      const overrides = JSON.parse(rawValue) as Partial<Profile>;
      return {
        ...profile,
        ...overrides,
      };
    } catch {
      return profile;
    }
  }

  private persistLocalOverrides(profile: Profile): void {
    const overrides: Partial<Profile> = {
      fullName: profile.fullName,
      bio: profile.bio ?? '',
      position: profile.position ?? '',
      height: profile.height ?? '',
      weight: profile.weight ?? '',
      careerHistory: profile.careerHistory ?? '',
    };

    localStorage.setItem(this.LOCAL_PROFILE_STORAGE_KEY, JSON.stringify(overrides));
  }

  private getMockProfile(profileId: string | null): Profile | null {
    if (!profileId) {
      return null;
    }

    const mockProfiles: Record<string, Profile> = {
      'athlete-1': {
        id: 'athlete-1',
        name: 'Lucas Andrade',
        fullName: 'Lucas Andrade',
        role: 'JOGADOR',
        position: 'Atacante',
        height: '1,78 m',
        weight: '72 kg',
        bio: 'Atacante com mobilidade, ataque em profundidade e finalizacao curta.',
        careerHistory: 'Base regional, competicoes sub-17 e torneios de observacao.'
      },
      'athlete-3': {
        id: 'athlete-3',
        name: 'Pedro Alves',
        fullName: 'Pedro Alves',
        role: 'JOGADOR',
        position: 'Ala',
        height: '1,74 m',
        weight: '69 kg',
        bio: 'Jogador de intensidade, bom no um contra um curto e recomposicao.',
        careerHistory: 'Futsal escolar e competicoes estaduais.'
      },
      'athlete-4': {
        id: 'athlete-4',
        name: 'Vitor Lima',
        fullName: 'Vitor Lima',
        role: 'JOGADOR',
        position: 'Zagueiro',
        height: '1,84 m',
        weight: '78 kg',
        bio: 'Zagueiro com boa cobertura e saida curta sob pressao.',
        careerHistory: 'Categoria sub-20 e torneios de base.'
      },
      'athlete-6': {
        id: 'athlete-6',
        name: 'Thiago Melo',
        fullName: 'Thiago Melo',
        role: 'JOGADOR',
        position: 'Volante',
        height: '1,80 m',
        weight: '75 kg',
        bio: 'Volante de equilibrio, coberturas centrais e boa inversao.',
        careerHistory: 'Ligas regionais e competicoes universitarias.'
      },
      'talent-1': {
        id: 'talent-1',
        name: 'Mateus Costa',
        fullName: 'Mateus Costa',
        role: 'JOGADOR',
        position: 'Meia',
        bio: 'Visao de jogo e passe vertical.',
        careerHistory: 'Base catarinense.'
      },
      'talent-2': {
        id: 'talent-2',
        name: 'Joao Pedro',
        fullName: 'Joao Pedro',
        role: 'JOGADOR',
        position: 'Ponta',
        bio: 'Arranque curto e finalizacao rapida.',
        careerHistory: 'Futebol 7 e competicoes sub-20.'
      },
      'talent-3': {
        id: 'talent-3',
        name: 'Lucas Ribeiro',
        fullName: 'Lucas Ribeiro',
        role: 'JOGADOR',
        position: 'Volante',
        bio: 'Intensidade, cobertura e leitura defensiva.',
        careerHistory: 'Futsal profissional.'
      },
      'talent-4': {
        id: 'talent-4',
        name: 'Gabriel Santos',
        fullName: 'Gabriel Santos',
        role: 'JOGADOR',
        position: 'Atacante',
        bio: 'Ataque ao espaco e boa definicao.',
        careerHistory: 'Competições de base em Sao Paulo.'
      }
    };

    return mockProfiles[profileId] ?? null;
  }

  private getMockPostsForProfile(profileId: string): Post[] {
    const baseDate = new Date().toISOString();
    const mockPosts: Record<string, Post[]> = {
      'athlete-1': [
        this.createMockVideoPost('athlete-1-post-1', profileId, 'Lucas Andrade', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', 'Ataque em profundidade e finalizacao.'),
        this.createMockVideoPost('athlete-1-post-2', profileId, 'Lucas Andrade', 'https://www.w3schools.com/html/mov_bbb.mp4', 'Movimento curto na area.')
      ],
      'athlete-3': [
        this.createMockVideoPost('athlete-3-post-1', profileId, 'Pedro Alves', 'https://www.w3schools.com/html/movie.mp4', '1x1 curto e mudanca de direcao.')
      ],
      'athlete-4': [
        this.createMockVideoPost('athlete-4-post-1', profileId, 'Vitor Lima', 'https://www.w3schools.com/html/mov_bbb.mp4', 'Cobertura e bola aerea.')
      ],
      'athlete-6': [
        this.createMockVideoPost('athlete-6-post-1', profileId, 'Thiago Melo', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', 'Equilibrio defensivo e inversao.')
      ],
      'talent-1': [
        this.createMockVideoPost('talent-1-post-1', profileId, 'Mateus Costa', 'https://www.w3schools.com/html/mov_bbb.mp4', 'Passe vertical e mudanca de corredor.')
      ],
      'talent-2': [
        this.createMockVideoPost('talent-2-post-1', profileId, 'Joao Pedro', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', 'Arranque curto no Futebol 7.')
      ],
      'talent-3': [
        this.createMockVideoPost('talent-3-post-1', profileId, 'Lucas Ribeiro', 'https://www.w3schools.com/html/movie.mp4', 'Cobertura defensiva e pressao.')
      ],
      'talent-4': [
        this.createMockVideoPost('talent-4-post-1', profileId, 'Gabriel Santos', 'https://www.w3schools.com/html/mov_bbb.mp4', 'Ataque ao espaco e finalizacao.')
      ]
    };

    return mockPosts[profileId] ?? [
      {
        id: `${profileId}-fallback-post`,
        user: { id: profileId, username: this.profile?.fullName || 'Atleta' },
        mediaUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        mediaType: FileType.VIDEO,
        caption: 'Jogada em destaque',
        likesCount: 12,
        commentsCount: 2,
        isLiked: false,
        createdAt: baseDate
      }
    ];
  }

  private createMockVideoPost(id: string, userId: string, username: string, mediaUrl: string, caption: string): Post {
    return {
      id,
      user: { id: userId, username },
      mediaUrl,
      mediaType: FileType.VIDEO,
      caption,
      likesCount: 18,
      commentsCount: 4,
      isLiked: false,
      createdAt: new Date().toISOString()
    };
  }
}
