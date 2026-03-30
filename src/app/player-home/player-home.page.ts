import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild, OnDestroy, OnInit } from '@angular/core';
import {
  IonAvatar,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  MenuController,
  ModalController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chatbubbleEllipsesOutline,
  closeOutline,
  createOutline,
  logOutOutline,
  personCircleOutline,
  starOutline
} from 'ionicons/icons';
import { Observable, Subscription, map } from 'rxjs';
import { Router } from '@angular/router';

import { AuthService, JwtPayload } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { ChatService, Contact } from '../services/chat.service';
import { PostService } from '../services/post.service';
import { Post } from '../models/post.model';
import { FileType } from '../models/upload.model';
import { PerfilSearchComponent } from '../perfil-search/perfil-search.component';
import { ProfileDrawerComponent } from './components/profile-drawer/profile-drawer.component';
import { PlayerChatInboxComponent } from './components/player-chat-inbox/player-chat-inbox.component';
import { PlayerChatSheetComponent } from './components/player-chat-sheet/player-chat-sheet.component';
import { environment } from '../../environments/environment';
import { PlayerChatStatus } from '../models/player-chat.models';
import { PlayerChatUiService } from '../services/player-chat-ui.service';

interface ArenaAthlete {
  post: Post;
  name: string;
  modality: string;
  position: string;
  tag: 'Em Alta' | 'Mais Visto';
  growth: string;
  likes: string;
}

type ArenaTab = 'mine' | 'ranking' | 'new';

interface PlayerShowcaseVideo {
  id: string;
  athleteId: string;
  athleteName: string;
  mediaUrl: string;
  modality: string;
  position: string;
  region: string;
  description: string;
  likes: number;
  createdAt: string;
  scoutId: string;
  scoutName: string;
  scoutAvatarUrl?: string | null;
  hasInvite: boolean;
  isMine: boolean;
}

@Component({
  selector: 'app-player-home',
  templateUrl: './player-home.page.html',
  styleUrls: ['./player-home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonAvatar,
    IonFooter,
    IonSpinner,
    IonSkeletonText,
    IonRefresher,
    IonRefresherContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonMenu,
    IonTitle,
    IonList,
    IonItem,
    IonLabel,
    PerfilSearchComponent,
    IonBadge,
    ProfileDrawerComponent
  ],
})
export class PlayerHomePage implements OnInit, OnDestroy {
  @ViewChild(IonContent) content!: IonContent;

  userProfile: any | null = null;
  avatarLoadFailed = false;
  isLoading = true;
  userRole: string | null = null;
  isMessagesMenuOpen = false;
  activeTab: ArenaTab = 'mine';

  posts$: Observable<Post[]>;
  featuredAthlete$: Observable<ArenaAthlete | null>;
  rankingAthletes$: Observable<ArenaAthlete[]>;
  newAthletes$: Observable<ArenaAthlete[]>;
  showcaseVideos: PlayerShowcaseVideo[] = [];
  rankingVideos: PlayerShowcaseVideo[] = [];
  newVideos: PlayerShowcaseVideo[] = [];
  myVideos: PlayerShowcaseVideo[] = [];
  featuredVideo: PlayerShowcaseVideo | null = null;

  contacts: Contact[] = [];
  contactsLoading = false;
  contactsHasMore = true;

  get userName(): string {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    return decodedToken?.name || 'Clube';
  }

  private contactsSubscription!: Subscription;

  private readonly modalities = ['Futebol', 'Basquete', 'Vôlei', 'Atletismo', 'Futsal', 'Natação'];
  private readonly positions = ['Atacante', 'Armador', 'Ponteiro', 'Meio-Campo', 'Pivô', 'Líbero'];

  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private router = inject(Router);
  private postService = inject(PostService);
  private menuController = inject(MenuController);
  private chatService = inject(ChatService);
  private modalController = inject(ModalController);
  private toastController = inject(ToastController);
  private playerChatUiService = inject(PlayerChatUiService);

  constructor() {
    this.posts$ = this.postService.homePosts$;

    this.featuredAthlete$ = this.posts$.pipe(
      map((posts) => {
        const featuredPost = this.getFeaturedPost(posts);
        return featuredPost ? this.toArenaAthlete(featuredPost, 0) : null;
      })
    );

    this.rankingAthletes$ = this.posts$.pipe(
      map((posts) => this.getRankingPosts(posts).map((post, index) => this.toArenaAthlete(post, index + 1)))
    );

    this.newAthletes$ = this.posts$.pipe(
      map((posts) => this.getNewestPosts(posts).map((post, index) => this.toArenaAthlete(post, index + 7)))
    );

    this.extractRoleFromToken();
    this.initializeMockShowcase();

    addIcons({
      chatbubbleEllipsesOutline,
      closeOutline,
      createOutline,
      logOutOutline,
      personCircleOutline,
      starOutline
    });
  }

  ngOnInit(): void {
    this.contactsSubscription = this.chatService.contactsState$.subscribe((state) => {
      this.contacts = state.items;
      this.contactsLoading = state.isLoading;
      this.contactsHasMore = state.hasMore;
    });
  }

  ionViewWillEnter(): void {
    this.apiService.get<any>('/profile/me').subscribe({
      next: (profile) => {
        if (profile && profile.urlPefil) {
          profile.urlPerfil = profile.urlPefil;
          delete profile.urlPefil;
        }

        if (profile) {
          const rawAvatar = profile.urlPerfil || profile.urlProfileImage || null;
          profile.urlPerfil = this.normalizeAvatarUrl(rawAvatar);
        }

        this.userProfile = profile;
        this.avatarLoadFailed = false;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load user profile', err);
        this.isLoading = false;
      },
    });

    if (this.postService.shouldLoadInitialHomePosts()) {
      this.postService.loadHomePosts().subscribe();
    }
  }

  onMenuOpen(): void {
    this.isMessagesMenuOpen = true;
    this.loadContacts();
  }

  onMenuClose(): void {
    this.isMessagesMenuOpen = false;
  }

  loadContacts(): void {
    this.chatService.loadContacts().subscribe();
  }

  loadMoreContacts(event: any): void {
    if (this.contactsLoading || !this.contactsHasMore) {
      event.target.complete();
      return;
    }

    this.chatService.loadMoreContacts().subscribe({
      next: () => event.target.complete(),
      error: () => event.target.complete(),
    });
  }

  loadMorePosts(event: any): void {
    event.target.complete();
  }

  refreshPosts(event: any): void {
    this.initializeMockShowcase();
    event.target.complete();
  }

  onMessagesClick(): void {
    this.menuController.open('messagesMenu');
  }

  onHomeClick(): void {
    this.content.scrollToTop(500);
  }

  goToCreatePost(): void {
    this.router.navigateByUrl('/create-post');
  }

  setActiveTab(tab: ArenaTab): void {
    this.activeTab = tab;
  }

  onHeaderAvatarClick(): void {
    this.menuController.open('profileMenu');
  }

  onAvatarImageError(): void {
    this.avatarLoadFailed = true;
  }

  onDrawerMyVideos(): void {
    this.menuController.close('profileMenu');
    this.router.navigateByUrl('/profile-player');
  }

  onDrawerEditProfile(): void {
    this.menuController.close('profileMenu');
    this.router.navigateByUrl('/profile-player');
  }

  onDrawerSignOut(): void {
    this.menuController.close('profileMenu');
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  editPlayerProfile(): void {
    this.router.navigateByUrl('/profile-player');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  closeMessagesMenu(): void {
    this.menuController.close('messagesMenu');
  }

  selectContact(contact: any): void {
    if (contact.id && contact.fullName) {
      this.router.navigate(['/chat', contact.id], {
        state: { contact },
      });
    }

    this.menuController.close('messagesMenu');
  }

  trackById(index: number, post: Post): string {
    return post.id;
  }

  trackByAthleteId(index: number, athlete: ArenaAthlete): string {
    return athlete.post.id;
  }

  trackByVideoId(index: number, video: PlayerShowcaseVideo): string {
    return video.id;
  }

  isVideo(post: Post): boolean {
    return post.mediaType === FileType.VIDEO;
  }

  getVideoStatus(video: PlayerShowcaseVideo): PlayerChatStatus {
    const thread = this.playerChatUiService.getThread(video.scoutId, video.scoutName, video.scoutAvatarUrl);
    return thread.status;
  }

  hasIncomingInvite(video: PlayerShowcaseVideo): boolean {
    return this.getVideoStatus(video) !== 'SEM_CONVITE';
  }

  getChatButtonLabel(video: PlayerShowcaseVideo): string {
    return this.getVideoStatus(video) === 'LIBERADO' ? 'Abrir chat' : 'Ver convite';
  }

  get myInviteCount(): number {
    return this.myVideos.filter((video) => this.hasIncomingInvite(video)).length;
  }

  get activeChatCount(): number {
    return this.myInviteCount;
  }

  async openScoutChat(video: PlayerShowcaseVideo): Promise<void> {
    if (this.getVideoStatus(video) === 'SEM_CONVITE') {
      return;
    }

    const modal = await this.modalController.create({
      component: PlayerChatSheetComponent,
      componentProps: {
        scoutId: video.scoutId,
        scoutName: video.scoutName,
        scoutAvatarUrl: video.scoutAvatarUrl ?? null,
      },
      breakpoints: [0, 0.35, 0.7, 0.95],
      initialBreakpoint: 0.7,
      backdropBreakpoint: 0.35,
      canDismiss: true,
      handle: true
    });

    await modal.present();
  }

  openAthleteProfile(video: PlayerShowcaseVideo): void {
    if (video.isMine) {
      this.router.navigateByUrl('/profile-player');
      return;
    }

    this.router.navigate(['/profile-player', video.athleteId]);
  }

  async openChatInbox(): Promise<void> {
    const modal = await this.modalController.create({
      component: PlayerChatInboxComponent,
      breakpoints: [0, 0.45, 0.8, 0.95],
      initialBreakpoint: 0.8,
      backdropBreakpoint: 0.45,
      canDismiss: true,
      handle: true
    });

    await modal.present();
  }

  async showNoInviteToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Esse video ainda nao recebeu interesse de olheiros.',
      duration: 1800,
      color: 'medium',
      position: 'top'
    });

    await toast.present();
  }

  hasAvatar(): boolean {
    return !!this.userProfile?.urlPerfil && !this.avatarLoadFailed;
  }

  private normalizeAvatarUrl(rawUrl: string | null): string | null {
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

  private extractRoleFromToken(): void {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    if (decodedToken && decodedToken.role) {
      this.userRole = decodedToken.role;
    }
  }

  private initializeMockShowcase(): void {
    this.showcaseVideos = [
      {
        id: 'showcase-1',
        athleteId: 'athlete-1',
        athleteName: 'Lucas Andrade',
        mediaUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        modality: 'Futebol de campo',
        position: 'Atacante',
        region: 'Florianopolis, SC',
        description: 'Finalizacao curta, aceleracao e leitura de espaco na ultima linha.',
        likes: 19320,
        createdAt: '2026-03-02T10:10:00.000Z',
        scoutId: 'scout-1',
        scoutName: 'Ricardo Moraes',
        hasInvite: false,
        isMine: false
      },
      {
        id: 'showcase-2',
        athleteId: 'athlete-me',
        athleteName: 'Mateus Silva',
        mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        modality: 'Futebol 7',
        position: 'Meia',
        region: 'Curitiba, PR',
        description: 'Passe vertical, inversao rapida e controle orientado.',
        likes: 15840,
        createdAt: '2026-03-01T14:40:00.000Z',
        scoutId: 'scout-2',
        scoutName: 'Joao Teles',
        hasInvite: true,
        isMine: true
      },
      {
        id: 'showcase-3',
        athleteId: 'athlete-3',
        athleteName: 'Pedro Alves',
        mediaUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        modality: 'Futsal',
        position: 'Ala',
        region: 'Joinville, SC',
        description: 'Pressao alta, 1x1 curto e intensidade sem bola.',
        likes: 11200,
        createdAt: '2026-03-03T08:30:00.000Z',
        scoutId: 'scout-3',
        scoutName: 'Camila Duarte',
        hasInvite: false,
        isMine: false
      },
      {
        id: 'showcase-4',
        athleteId: 'athlete-4',
        athleteName: 'Vitor Lima',
        mediaUrl: 'https://www.w3schools.com/html/movie.mp4',
        modality: 'Futebol de campo',
        position: 'Zagueiro',
        region: 'Porto Alegre, RS',
        description: 'Cobertura defensiva, jogo aereo e saida curta sob pressao.',
        likes: 9650,
        createdAt: '2026-02-28T16:15:00.000Z',
        scoutId: 'scout-4',
        scoutName: 'Marcos Vinicius',
        hasInvite: false,
        isMine: false
      },
      {
        id: 'showcase-5',
        athleteId: 'athlete-me-2',
        athleteName: 'Rafael Costa',
        mediaUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        modality: 'Futebol 7',
        position: 'Ponta',
        region: 'Sao Jose, SC',
        description: 'Ataque de espaco, cruzamento em velocidade e recomposicao rapida.',
        likes: 7440,
        createdAt: '2026-03-03T11:00:00.000Z',
        scoutId: 'scout-5',
        scoutName: 'Bruno Saad',
        hasInvite: true,
        isMine: true
      },
      {
        id: 'showcase-6',
        athleteId: 'athlete-6',
        athleteName: 'Thiago Melo',
        mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        modality: 'Futebol de campo',
        position: 'Volante',
        region: 'Blumenau, SC',
        description: 'Cobertura central, bola longa e leitura de segunda bola.',
        likes: 6820,
        createdAt: '2026-03-03T13:12:00.000Z',
        scoutId: 'scout-6',
        scoutName: 'Fernanda Cezar',
        hasInvite: false,
        isMine: false
      }
    ];

    this.showcaseVideos.forEach((video) => {
      if (video.hasInvite) {
        this.playerChatUiService.ensureInvite(video.scoutId, video.scoutName, video.scoutAvatarUrl);
      } else {
        this.playerChatUiService.getThread(video.scoutId, video.scoutName, video.scoutAvatarUrl);
      }
    });

    this.rankingVideos = [...this.showcaseVideos]
      .sort((first, second) => second.likes - first.likes)
      .slice(0, 5);
    this.newVideos = [...this.showcaseVideos]
      .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
    this.myVideos = this.showcaseVideos.filter((video) => video.isMine);
    this.featuredVideo = this.rankingVideos[0] ?? null;
  }

  private getFeaturedPost(posts: Post[]): Post | null {
    if (posts.length === 0) {
      return null;
    }

    const videoPost = posts.find((post) => post.mediaType === FileType.VIDEO);
    return videoPost ?? posts[0];
  }

  private getRankingPosts(posts: Post[]): Post[] {
    if (posts.length === 0) {
      return [];
    }

    const featured = this.getFeaturedPost(posts);
    const videos = posts.filter((post) => post.mediaType === FileType.VIDEO && post.id !== featured?.id);

    if (videos.length >= 4) {
      return videos.slice(0, 6);
    }

    return posts.filter((post) => post.id !== featured?.id).slice(0, 6);
  }

  private getNewestPosts(posts: Post[]): Post[] {
    const sortedPosts = [...posts].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return sortedPosts.slice(0, 6);
  }

  private toArenaAthlete(post: Post, seed: number): ArenaAthlete {
    const modality = this.modalities[seed % this.modalities.length];
    const position = this.positions[(seed + 2) % this.positions.length];
    const name = post.user?.username?.trim() || 'Atleta';
    const tag: 'Em Alta' | 'Mais Visto' = seed % 2 === 0 ? 'Em Alta' : 'Mais Visto';
    const growth = `+${6 + (seed % 7) * 3}%`;
    const likes = this.formatLikes(post.likesCount, post.commentsCount, seed);

    return {
      post,
      name,
      modality,
      position,
      tag,
      growth,
      likes,
    };
  }

  private formatLikes(likesCount: number, commentsCount: number, seed: number): string {
    const estimatedLikes = likesCount * 137 + commentsCount * 53 + 1200 + seed * 80;

    if (estimatedLikes >= 1000) {
      const inThousands = (estimatedLikes / 1000).toFixed(1).replace('.', ',');
      return `${inThousands} mil`;
    }

    return `${estimatedLikes}`;
  }

  ngOnDestroy(): void {
    if (this.contactsSubscription) {
      this.contactsSubscription.unsubscribe();
    }

    this.chatService.resetContacts();
  }
}
