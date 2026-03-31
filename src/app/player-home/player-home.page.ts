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
import { ChatService } from '../services/chat.service';
import { PostService } from '../services/post.service';
import { Post } from '../models/post.model';
import { FileType } from '../models/upload.model';
import { PerfilSearchComponent } from '../perfil-search/perfil-search.component';
import { ProfileDrawerComponent } from './components/profile-drawer/profile-drawer.component';
import { PlayerChatInboxComponent } from './components/player-chat-inbox/player-chat-inbox.component';
import { InvitesSheetComponent } from './components/invites-sheet/invites-sheet.component';
import { environment } from '../../environments/environment';

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
  inviteStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | null;
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

  activeChatCount = 0;

  get userName(): string {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    return decodedToken?.name || 'Clube';
  }

  private threadsSubscription!: Subscription;

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
    this.threadsSubscription = this.chatService.threads$.subscribe(threads => {
      this.activeChatCount = threads.length;
    });

    this.chatService.loadThreads().subscribe();

    this.posts$.subscribe(posts => {
      const videos = posts.filter(p => p.mediaType === FileType.VIDEO);

      const allRanking = [...videos]
        .sort((a, b) => b.likesCount - a.likesCount)
        .map(p => this.mapPostToVideo(p));

      this.featuredVideo = allRanking[0] ?? null;

      // Exclui o primeiro vídeo (destaque) da lista de ranking
      this.rankingVideos = allRanking.slice(1, 10);

      const allNew = [...videos]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(p => this.mapPostToVideo(p));

      // Exclui o vídeo que está em destaque da lista de novos para não repetir
      this.newVideos = allNew.filter(v => v.id !== this.featuredVideo?.id);
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

        this.loadMyPosts();
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

  private loadMyPosts(): void {
    this.postService.getPostsForAuthenticatedUser(10).subscribe({
      next: (res) => {
        this.myVideos = res.posts
          .filter(p => p.mediaType === FileType.VIDEO)
          .map(p => this.mapPostToVideo(p, true));
      }
    });
  }

  private mapPostToVideo(post: Post, isMine: boolean = false): PlayerShowcaseVideo {
    return {
      id: post.id,
      athleteId: String(post.athleteId || post.user.id),
      athleteName: post.user.username,
      mediaUrl: post.mediaUrl,
      modality: 'Futebol',
      position: 'Atleta',
      region: '',
      description: post.caption,
      likes: post.likesCount,
      createdAt: post.createdAt,
      scoutId: String(post.scoutId || ''),
      scoutName: 'Olheiro',
      hasInvite: !!post.inviteStatus,
      isMine: isMine,
      inviteStatus: post.inviteStatus
    };
  }

  onMenuOpen(): void {
  }

  onMenuClose(): void {
  }

  loadContacts(): void {
  }

  loadMoreContacts(event: any): void {
    event.target.complete();
  }

  setActiveTab(tab: ArenaTab): void {
    this.activeTab = tab;

    if (tab === 'ranking' || tab === 'new') {
      // Sempre recarrega os posts da API ao trocar de aba para garantir dados frescos
      this.postService.refreshHomePosts().subscribe();
    } else if (tab === 'mine') {
      this.loadMyPosts();
    }
  }

  loadMorePosts(event: any): void {
    if (this.activeTab === 'ranking' || this.activeTab === 'new') {
      this.postService.loadHomePosts().subscribe({
        next: (res) => {
          event.target.complete();
          if (res && !res.nextCursor) {
            event.target.disabled = true;
          }
        },
        error: () => event.target.complete()
      });
    } else {
      event.target.complete();
      event.target.disabled = true;
    }
  }

  refreshPosts(event: any): void {
    if (this.activeTab === 'ranking' || this.activeTab === 'new') {
      this.postService.refreshHomePosts().subscribe({
        next: () => event.target.complete(),
        error: () => event.target.complete()
      });
    } else {
      this.loadMyPosts();
      event.target.complete();
    }
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

  hasIncomingInvite(video: PlayerShowcaseVideo): boolean {
    return video.inviteStatus === 'PENDING' || video.inviteStatus === 'ACCEPTED';
  }

  getChatButtonLabel(video: PlayerShowcaseVideo): string {
    if (video.inviteStatus === 'ACCEPTED') {
      return 'Abrir chat';
    }
    return 'Ver convite';
  }

  get myInviteCount(): number {
    return this.myVideos.filter((video) => this.hasIncomingInvite(video)).length;
  }

  async openScoutChat(video: PlayerShowcaseVideo): Promise<void> {
    if (!this.hasIncomingInvite(video)) {
      return;
    }

    // Agora o fluxo real é via openInvitesSheet ou pela inbox central.
    // Para consistência, abrimos a lista de convites do post se for Ver Convite.
    if (video.inviteStatus === 'PENDING') {
      this.openInvitesSheet(video.id);
    } else {
      // Se já aceitou, o ideal é abrir a modal de chat diretamente se tivermos o threadId
      // No momento o componente de vídeo não tem o threadId direto,
      // então instruímos o usuário a ir pela central de chats ou listagem.
      this.openChatInbox();
    }
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

  async openInvitesSheet(postId: string): Promise<void> {
    const modal = await this.modalController.create({
      component: InvitesSheetComponent,
      componentProps: {
        postId: postId
      },
      breakpoints: [0, 0.5, 0.8, 0.95],
      initialBreakpoint: 0.8,
      backdropBreakpoint: 0.5,
      canDismiss: true,
      handle: true,
      cssClass: 'invites-modal-sheet'
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
    this.showcaseVideos = [];
    this.rankingVideos = [];
    this.newVideos = [];
    this.myVideos = [];
    this.featuredVideo = null;
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
    if (this.threadsSubscription) {
      this.threadsSubscription.unsubscribe();
    }
  }
}
