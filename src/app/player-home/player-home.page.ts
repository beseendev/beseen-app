import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild, OnDestroy, OnInit, AfterViewInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
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
  createOutline, helpCircleOutline,
  logOutOutline,
  personCircleOutline,
  starOutline
} from 'ionicons/icons';
import { Observable, Subscription, map, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

import { AuthService, JwtPayload } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { ChatService } from '../services/chat.service';
import { PostService } from '../services/post.service';
import { AdvertisementService } from '../services/advertisement.service';
import { Post } from '../models/post.model';
import { Advertisement } from '../models/advertisement.model';
import { FileType } from '../models/upload.model';
import { ProfileDrawerComponent } from './components/profile-drawer/profile-drawer.component';
import { ChatInboxComponent } from '../components/chat-inbox/chat-inbox.component';
import { InvitesSheetComponent } from './components/invites-sheet/invites-sheet.component';
import { AdCardComponent } from '../components/ad-card/ad-card.component';
import { environment } from '../../environments/environment';
import {IonicModule} from "@ionic/angular";

interface ArenaAthlete {
  post: Post;
  name: string;
  modality?: string;
  position?: string;
  tag?: 'Em Alta' | 'Mais Visto';
  growth?: string;
  likes: string;
}

type ArenaTab = 'mine' | 'ranking' | 'new';

interface PlayerShowcaseVideo {
  id: string;
  athleteId: string;
  athleteName: string;
  athleteAvatarUrl?: string | null;
  mediaUrl: string;
  modality?: string;
  position?: string;
  region?: string;
  description: string;
  likes: number;
  createdAt: string;
  scoutId: string;
  scoutName?: string;
  scoutAvatarUrl?: string | null;
  hasInvite: boolean;
  isMine: boolean;
  inviteStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | null;
}

export type PlayerFeedItem = { type: 'video', video: PlayerShowcaseVideo } | { type: 'ad', ad: Advertisement };

@Component({
  selector: 'app-player-home',
  templateUrl: './player-home.page.html',
  styleUrls: ['./player-home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonToolbar,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
    IonSkeletonText,
    IonRefresher,
    IonRefresherContent,
    IonMenu,
    IonBadge,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    ProfileDrawerComponent,
    AdCardComponent
  ],
})
export class PlayerHomePage implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(IonContent) content!: IonContent;
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;
  @ViewChildren('vMine, vRanking, vNew') videoElements!: QueryList<ElementRef<HTMLVideoElement>>;

  private videoObserver?: IntersectionObserver;

  userProfile: any | null = null;
  avatarLoadFailed = false;
  isLoading = true;
  userRole: string | null = null;
  activeTab: ArenaTab = 'mine';

  posts$: Observable<Post[]>;
  showcaseVideos: PlayerShowcaseVideo[] = [];
  rankingVideos: PlayerShowcaseVideo[] = [];
  newVideos: PlayerShowcaseVideo[] = [];
  myVideos: PlayerShowcaseVideo[] = [];
  featuredVideo: PlayerShowcaseVideo | null = null;

  // Arrays for display with ads interleaved
  myVideosWithAds: PlayerFeedItem[] = [];
  rankingVideosWithAds: PlayerFeedItem[] = [];
  newVideosWithAds: PlayerFeedItem[] = [];

  private rankingCurrentPage = 0;
  private myPostsNextCursor: string | null = null;
  activeChatCount = 0;

  private threadsSubscription!: Subscription;

  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private router = inject(Router);
  private postService = inject(PostService);
  private adService = inject(AdvertisementService);
  private menuController = inject(MenuController);
  private chatService = inject(ChatService);
  private modalController = inject(ModalController);
  private toastController = inject(ToastController);

  constructor() {
    this.posts$ = this.postService.homePosts$;
    this.extractRoleFromToken();

    addIcons({
      chatbubbleEllipsesOutline,
      closeOutline,
      createOutline,
      logOutOutline,
      personCircleOutline,
      starOutline,
      helpCircleOutline
    });
  }

  get userName(): string {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    return decodedToken?.name || 'Clube';
  }

  openSupport() {
    this.router.navigate(['/suporte']);
  }

  ngOnInit(): void {
    this.threadsSubscription = this.chatService.threads$.subscribe(threads => {
      this.activeChatCount = threads.length;
    });

    this.chatService.loadThreads().subscribe();

    this.posts$.subscribe(async posts => {
      const videos = posts.filter(p => p.mediaType === FileType.VIDEO);

      const allRanking = [...videos]
        .sort((a, b) => b.likesCount - a.likesCount)
        .map(p => this.mapPostToVideo(p));

      this.featuredVideo = allRanking[0] ?? null;

      // Inclui todos os vídeos na lista de ranking para o feed TikTok
      this.rankingVideos = allRanking.slice(0, 10);
      this.rankingVideosWithAds = await this.interleaveAds(this.rankingVideos);

      const allNew = [...videos]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(p => this.mapPostToVideo(p));

      // Inclui todos os vídeos na lista de novos
      this.newVideos = allNew.slice(0, 10);
      this.newVideosWithAds = await this.interleaveAds(this.newVideos);
    });
  }

  private async interleaveAds(videos: PlayerShowcaseVideo[]): Promise<PlayerFeedItem[]> {
    const result: PlayerFeedItem[] = [];
    for (let i = 0; i < videos.length; i++) {
      result.push({ type: 'video', video: videos[i] });
      if ((i + 1) % 9 === 0) {
        try {
          const ad = await firstValueFrom(this.adService.getRandomAdvertisement());
          if (ad) {
            result.push({ type: 'ad', ad });
          }
        } catch (e) {
          console.error('Error fetching ad', e);
        }
      }
    }
    return result;
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

        this.loadMyPosts(true);
      },
      error: (err) => {
        console.error('Failed to load user profile', err);
        this.isLoading = false;
      },
    });

    if (this.postService.shouldLoadInitialHomePosts()) {
      this.postService.loadHomePosts(11).subscribe();
    }
  }

  ngAfterViewInit(): void {
    this.setupVideoObserver();
    this.videoElements.changes.subscribe(() => {
      this.setupVideoObserver();
    });
  }

  private setupVideoObserver(): void {
    if (this.videoObserver) {
      this.videoObserver.disconnect();
    }

    this.videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          video.play().catch(e => console.log('Autoplay blocked:', e));
        } else {
          video.pause();
        }
      });
    }, {
      threshold: 0.6 // Video must be 60% visible to play
    });

    this.videoElements.forEach(videoRef => {
      this.videoObserver?.observe(videoRef.nativeElement);
    });
  }

  private loadMyPosts(isRefresh = true, event?: any): void {
    if (isRefresh) {
      this.myPostsNextCursor = null;
    }

    this.postService.getPostsForAuthenticatedUser(10, this.myPostsNextCursor || undefined).subscribe({
      next: async (res) => {
        const mapped = res.posts
          .filter(p => p.mediaType === FileType.VIDEO)
          .map(p => this.mapPostToVideo(p, true));

        if (isRefresh) {
          this.myVideos = mapped;
        } else {
          const filtered = mapped.filter(newVideo => !this.myVideos.some(existing => existing.id === newVideo.id));
          this.myVideos = [...this.myVideos, ...filtered];
        }

        this.myVideosWithAds = await this.interleaveAds(this.myVideos);

        this.myPostsNextCursor = res.nextCursor;
        this.finalizeLoad(event, !res.nextCursor);
      },
      error: () => this.finalizeLoad(event)
    });
  }

  private loadRankingPosts(isRefresh = true, event?: any): void {
    if (isRefresh) {
      this.rankingCurrentPage = 0;
      if (this.infiniteScroll) {
        this.infiniteScroll.disabled = false;
      }
    }

    const pageParam: any = this.rankingCurrentPage;
    const limit = isRefresh ? 11 : 10;

    this.postService.getRankingPosts(limit, pageParam).subscribe({
      next: async (res) => {
        const mapped = res.posts
          .filter(p => p.mediaType === FileType.VIDEO)
          .map(p => this.mapPostToVideo(p));

        if (isRefresh) {
          this.featuredVideo = mapped[0] || null;
          this.rankingVideos = mapped;
        } else {
          const filtered = mapped.filter(newVideo =>
            !this.rankingVideos.some(existing => existing.id === newVideo.id)
          );
          this.rankingVideos = [...this.rankingVideos, ...filtered];
        }

        this.rankingVideosWithAds = await this.interleaveAds(this.rankingVideos);

        if (res.posts.length > 0) {
          this.rankingCurrentPage++;
        }

        this.finalizeLoad(event, res.posts.length === 0);
      },
      error: () => this.finalizeLoad(event)
    });
  }

  setActiveTab(tab: ArenaTab): void {
    this.activeTab = tab;

    if (this.infiniteScroll) {
      this.infiniteScroll.disabled = false;
    }

    if (tab === 'ranking') {
      this.loadRankingPosts(true);
    } else if (tab === 'new') {
      this.postService.refreshHomePosts().subscribe(() => {
        setTimeout(() => {
          if (this.infiniteScroll) {
            this.infiniteScroll.disabled = false;
          }
        }, 300);
      });
    } else if (tab === 'mine') {
      this.loadMyPosts(true);
    }
  }

  loadMorePosts(event: any): void {
    if (this.activeTab === 'ranking') {
      this.loadRankingPosts(false, event);
    } else if (this.activeTab === 'new') {
      this.postService.loadHomePosts().subscribe({
        next: (res) => {
          this.finalizeLoad(event, res && res.posts && res.posts.length === 0);
        },
        error: () => this.finalizeLoad(event)
      });
    } else if (this.activeTab === 'mine') {
      this.loadMyPosts(false, event);
    } else {
      this.finalizeLoad(event, true);
    }
  }

  refreshPosts(event: any): void {
    if (this.activeTab === 'ranking') {
      this.loadRankingPosts(true, event);
    } else if (this.activeTab === 'new') {
      this.postService.refreshHomePosts().subscribe({
        next: () => {
          this.finalizeLoad(event);
          setTimeout(() => {
            if (this.infiniteScroll) {
              this.infiniteScroll.disabled = false;
            }
          }, 300);
        },
        error: () => this.finalizeLoad(event)
      });
    } else {
      this.loadMyPosts(true, event);
    }
  }

  private finalizeLoad(event: any, shouldDisable: boolean = false): void {
    if (event) {
      event.target.complete();
      if (shouldDisable) {
        event.target.disabled = true;
      }
    }
  }

  private mapPostToVideo(post: Post, isMine: boolean = false): PlayerShowcaseVideo {
    const rawAvatar = post.user.urlPerfil || (post.user as any).urlProfileImage || null;
    return {
      id: post.id,
      athleteId: String(post.athleteId || post.user.id),
      athleteName: post.user.username,
      athleteAvatarUrl: this.normalizeAvatarUrl(rawAvatar),
      mediaUrl: post.mediaUrl,
      modality: (post.user as any).modality || (post.user as any).modalidade,
      position: (post.user as any).position || (post.user as any).posicao || (post.user as any).cargoOuFuncao,
      region: (post.user as any).region || (post.user as any).cidade,
      description: post.caption,
      likes: post.likesCount,
      createdAt: post.createdAt,
      scoutId: String(post.scoutId || ''),
      hasInvite: !!post.inviteStatus,
      isMine: isMine,
      inviteStatus: post.inviteStatus
    };
  }

  goToCreatePost(): void {
    this.router.navigateByUrl('/create-post');
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

  trackByFeedItem(index: number, item: PlayerFeedItem): string {
    return item.type === 'video' ? item.video.id : `ad-${item.ad.id}`;
  }

  trackByVideoId(index: number, video: PlayerShowcaseVideo): string {
    return video.id;
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
    if (video.inviteStatus === 'PENDING') {
      this.openInvitesSheet(video.id);
    } else {
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
      component: ChatInboxComponent,
      componentProps: {
        isPlayer: true
      },
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

  toggleFullScreen(video: any) {
    console.log('toggleFullScreen chamado para:', video);
    if (!video) return;

    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
    } else if (video.webkitRequestFullscreen) {
      video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
      video.msRequestFullscreen();
    }
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
    const modality = (post.user as any).modality;
    const position = (post.user as any).position;
    const name = post.user?.username?.trim() || 'Atleta';
    const likes = this.formatLikes(post.likesCount);

    return {
      post,
      name,
      modality,
      position,
      likes,
    };
  }

  private formatLikes(likesCount: number): string {
    if (likesCount >= 1000) {
      const inThousands = (likesCount / 1000).toFixed(1).replace('.', ',');
      return `${inThousands} mil`;
    }

    return `${likesCount}`;
  }

  ngOnDestroy(): void {
    if (this.threadsSubscription) {
      this.threadsSubscription.unsubscribe();
    }
    if (this.videoObserver) {
      this.videoObserver.disconnect();
    }
  }
}
