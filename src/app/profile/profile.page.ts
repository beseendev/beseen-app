import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonContent, IonAvatar, IonLabel, IonGrid, IonRow, IonCol, IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonList, IonText, IonSegment, IonSegmentButton, IonInput, IonTextarea, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, createOutline, personAddOutline, chatbubbleOutline, personCircleOutline, briefcaseOutline, calendarOutline, bodyOutline, resizeOutline, scaleOutline, informationCircleOutline, timeOutline, imageOutline, videocamOutline, checkmarkOutline, closeOutline } from 'ionicons/icons';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileService } from '../services/profile.service';
import { PostService } from '../services/post.service';
import { Profile } from '../models/profile.model';
import { Post } from '../models/post.model';
import { FileType } from '../models/upload.model'; // Added FileType import
import { Observable, BehaviorSubject } from 'rxjs';
import { switchMap, tap, map, filter } from 'rxjs/operators';
import { PostCardComponent } from '../components/post-card/post-card.component';
import { AuthService } from '../services/auth.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton, IonIcon, IonContent, IonAvatar, IonLabel, IonGrid, IonRow, IonCol, IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent, IonItem,
    IonList, IonText,
    IonSegment, IonSegmentButton, IonInput, IonTextarea,
    PostCardComponent
  ],
})
export class ProfilePage implements OnInit {
  private readonly LOCAL_PROFILE_STORAGE_KEY = 'beseen-player-profile-overrides';
  profileId: string | null = null;
  profile: Profile | null = null;
  isMyProfile = false;
  isEditing = false;
  selectedSegment: 'images' | 'videos' = 'images';
  draftProfile: Partial<Profile> = {};
  private readonly DEFAULT_POST_LIMIT = 10;

  private profileService = inject(ProfileService);
  private postService = inject(PostService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private toastController = inject(ToastController);

  private userPostsSubject = new BehaviorSubject<Post[]>([]);
  filteredUserPosts$: Observable<Post[]>;
  private userPostsCurrentCursor: string | undefined;
  private userPostsHasMore = true;

  constructor() {
    addIcons({ arrowBackOutline, createOutline, personAddOutline, chatbubbleOutline, personCircleOutline, briefcaseOutline, calendarOutline, bodyOutline, resizeOutline, scaleOutline, informationCircleOutline, timeOutline, imageOutline, videocamOutline, checkmarkOutline, closeOutline });

    this.filteredUserPosts$ = this.userPostsSubject.asObservable().pipe(
      map(posts => posts.filter(post => {
        // Use FileType enum from post.model.ts for filtering
        if (this.selectedSegment === 'images') {
          return post.mediaType === FileType.IMAGE;
        } else if (this.selectedSegment === 'videos') {
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
        if (!this.profileId && profile) {
          this.profileId = profile.id;
        }
        this.syncDraftProfile();
        this.resetAndLoadUserPosts();
      })
    ).subscribe();
  }

  segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
  }

  goBack() {
    this.router.navigateByUrl('/home');
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

    const mergedProfile: Profile = {
      ...this.profile,
      ...this.draftProfile,
      fullName: (this.draftProfile.fullName || this.profile.fullName || '').trim() || this.profile.fullName,
      bio: (this.draftProfile.bio || '').trim(),
      position: (this.draftProfile.position || '').trim(),
      height: (this.draftProfile.height || '').trim(),
      weight: (this.draftProfile.weight || '').trim(),
      careerHistory: (this.draftProfile.careerHistory || '').trim(),
    };

    this.profile = mergedProfile;
    this.persistLocalOverrides(mergedProfile);
    this.isEditing = false;

    const toast = await this.toastController.create({
      message: 'Perfil atualizado no dispositivo.',
      duration: 2200,
      color: 'success',
      position: 'top',
    });
    await toast.present();
  }

  followUser() {
    console.log('Follow user', this.profile?.name);
  }

  startChat() {
    console.log('Start chat with', this.profile?.name);
  }

  async loadMoreUserPosts(event: any) {
    if (!this.userPostsHasMore || !this.profileId) {
      event.target.complete();
      return;
    }

    this.postService.getPostsForAuthenticatedUser(this.DEFAULT_POST_LIMIT, this.userPostsCurrentCursor).subscribe({
      next: response => {
        this.userPostsSubject.next([...this.userPostsSubject.getValue(), ...response.posts]);
        this.userPostsCurrentCursor = response.nextCursor || undefined;
        this.userPostsHasMore = !!response.nextCursor;
        event.target.complete();
      },
      error: err => {
        console.error('Error loading more user posts', err);
        event.target.complete();
      }
    });
  }

  async refreshUserPosts(event: any) {
    await this.resetAndLoadUserPosts();
    event.target.complete();
  }

  private async resetAndLoadUserPosts() {
    this.userPostsSubject.next([]);
    this.userPostsCurrentCursor = undefined;
    this.userPostsHasMore = true;

    if (this.profileId && !this.isMyProfile) {
      this.userPostsSubject.next(this.getMockPostsForProfile(this.profileId));
      this.userPostsHasMore = false;
      return;
    }

    if (this.profileId) {
      this.postService.getPostsForAuthenticatedUser(this.DEFAULT_POST_LIMIT, this.userPostsCurrentCursor).subscribe({
        next: response => {
          this.userPostsSubject.next(response.posts);
          this.userPostsCurrentCursor = response.nextCursor || undefined;
          this.userPostsHasMore = !!response.nextCursor;
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
