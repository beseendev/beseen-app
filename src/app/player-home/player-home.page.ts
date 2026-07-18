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
  IonPopover,
  IonMenu,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  MenuController,
  ModalController,
  PopoverController,
  ToastController,
  AlertController,
  ActionSheetController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chatbubbleEllipsesOutline,
  closeOutline,
  createOutline, helpCircleOutline,
  logOutOutline,
  personCircleOutline,
  starOutline,
  menuOutline,
  volumeHighOutline,
  volumeMuteOutline,
  mailOutline,
  flagOutline,
  banOutline,
  trashOutline
} from 'ionicons/icons';
import { Observable, Subscription, map, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

import { AuthService, JwtPayload } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { ProfileService } from '../services/profile.service';
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
import { ViewportVideoPlayerDirective } from '../shared/directives/viewport-video-player.directive';

interface ArenaAthlete {
  post: Post;
  name: string;
  modality?: string;
  position?: string;
  tag?: 'Em Alta' | 'Mais Visto';
  growth?: string;
  likes: string;
}

type ArenaTab = 'ranking' | 'new';

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
    IonSpinner,
    IonSkeletonText,
    IonRefresher,
    IonRefresherContent,
    IonMenu,
    IonBadge,
    IonList,
    IonItem,
    IonLabel,
    IonPopover,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    ProfileDrawerComponent,
    AdCardComponent,
    ViewportVideoPlayerDirective
  ],
})
export class PlayerHomePage implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(IonContent) content!: IonContent;
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;

  userProfile: any | null = null;
  avatarLoadFailed = false;
  isLoading = true;
  userRole: string | null = null;
  activeTab: ArenaTab = 'new';

  posts$: Observable<Post[]>;
  showcaseVideos: PlayerShowcaseVideo[] = [];
  rankingVideos: PlayerShowcaseVideo[] = [];
  newVideos: PlayerShowcaseVideo[] = [];
  featuredVideo: PlayerShowcaseVideo | null = null;

  rankingVideosWithAds: PlayerFeedItem[] = [];
  newVideosWithAds: PlayerFeedItem[] = [];

  private rankingCurrentPage = 0;
  activeChatCount = 0;
  pendingInvitesCount = 0;

  private threadsSubscription!: Subscription;
  private tabLoadSub?: Subscription;

  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private router = inject(Router);
  private postService = inject(PostService);
  private adService = inject(AdvertisementService);
  private menuController = inject(MenuController);
  private chatService = inject(ChatService);
  private modalController = inject(ModalController);
  private alertController = inject(AlertController);
  public popoverController = inject(PopoverController);
  private toastController = inject(ToastController);
  private actionSheetController = inject(ActionSheetController);
  private profileService = inject(ProfileService);

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
      helpCircleOutline,
      volumeHighOutline,
      volumeMuteOutline,
      mailOutline,
      flagOutline,
      banOutline,
      trashOutline
    });
  }

  async reportVideo(video: PlayerShowcaseVideo) {
    const alert = await this.alertController.create({
      header: 'Denunciar Vídeo',
      message: 'Por favor, informe o motivo da denúncia para análise de nossa equipe.',
      cssClass: 'be-alert',
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'Ex: Conteúdo impróprio, spam, etc.'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Denunciar',
          cssClass: 'be-danger-btn',
          handler: (data: { reason: string }) => {
            if (!data.reason?.trim()) {
              this.showToast('Por favor, descreva o motivo da denúncia.', 'warning');
              return false;
            }

            this.postService.reportPost(video.id, data.reason).subscribe({
              next: () => {
                this.showToast('Denúncia enviada com sucesso. Obrigado por nos ajudar a manter a comunidade segura!', 'success');
              },
              error: (err) => {
                console.error('Error reporting post', err);
                this.showToast('Erro ao enviar denúncia. Tente novamente mais tarde.', 'danger');
              }
            });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'top'
    });
    toast.present();
  }

  get userName(): string {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    return decodedToken?.name || 'Clube';
  }

  get userPosition(): string {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    return decodedToken?.position || 'JOGADOR';
  }

  openSupport() {
    this.router.navigate(['/suporte']);
  }

  ngOnInit(): void {
    this.chatService.activeChatsCount$.subscribe(count => {
      this.activeChatCount = count;
    });

    this.chatService.pendingInvitesCount$.subscribe(count => {
      this.pendingInvitesCount = count;
    });

    this.chatService.loadThreads().subscribe();
    this.chatService.refreshInviteCount().subscribe();

    this.posts$.subscribe(async posts => {
      const videos = posts.filter(p => p.mediaType === FileType.VIDEO);

      // Update "Novos" tab - let it grow with infinite scroll
      const allNew = [...videos]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(p => this.mapPostToVideo(p));

      this.newVideos = allNew;
      this.newVideosWithAds = await this.interleaveAds(this.newVideos);

      // Update "Ranking" tab only if not currently active or if empty
      // to avoid conflicting with loadRankingPosts() which uses a specialized API
      if (this.activeTab !== 'ranking' || this.rankingVideos.length === 0) {
        const allRanking = [...videos]
          .sort((a, b) => b.likesCount - a.likesCount)
          .map(p => this.mapPostToVideo(p));

        this.featuredVideo = allRanking[0] ?? null;
        this.rankingVideos = allRanking.slice(0, 10);
        this.rankingVideosWithAds = await this.interleaveAds(this.rankingVideos);
      }
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
  }


  private loadRankingPosts(isRefresh = true, event?: any): void {
    if (isRefresh && this.tabLoadSub) {
      this.tabLoadSub.unsubscribe();
    }

    if (isRefresh) {
      this.rankingCurrentPage = 0;
      if (this.infiniteScroll) {
        this.infiniteScroll.disabled = false;
      }
    }

    const pageParam: any = this.rankingCurrentPage;
    const limit = isRefresh ? 11 : 10;

    const sub = this.postService.getRankingPosts(limit, pageParam).subscribe({
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

    if (isRefresh) {
      this.tabLoadSub = sub;
    }
  }

  setActiveTab(tab: ArenaTab): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;

    if (this.tabLoadSub) {
      this.tabLoadSub.unsubscribe();
    }

    if (this.infiniteScroll) {
      this.infiniteScroll.disabled = false;
    }

    if (tab === 'ranking') {
      this.loadRankingPosts(true);
    } else if (tab === 'new') {
      this.tabLoadSub = this.postService.refreshHomePosts().subscribe(() => {
        setTimeout(() => {
          if (this.infiniteScroll) {
            this.infiniteScroll.disabled = false;
          }
        }, 300);
      });
    }
  }

  loadMorePosts(event: any): void {
    if (this.activeTab === 'ranking') {
      this.loadRankingPosts(false, event);
    } else if (this.activeTab === 'new') {
      this.tabLoadSub = this.postService.loadHomePosts().subscribe({
        next: (res) => {
          this.finalizeLoad(event, res && res.posts && res.posts.length === 0);
        },
        error: () => this.finalizeLoad(event)
      });
    } else {
      this.finalizeLoad(event, true);
    }
  }

  refreshPosts(event: any): void {
    if (this.tabLoadSub) {
      this.tabLoadSub.unsubscribe();
    }

    if (this.activeTab === 'ranking') {
      this.loadRankingPosts(true, event);
    } else if (this.activeTab === 'new') {
      this.tabLoadSub = this.postService.refreshHomePosts().subscribe({
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
    const profilePosition = isMine
      ? this.userProfile?.position || this.userProfile?.posicao || this.userProfile?.cargoOuFuncao
      : null;

    return {
      id: post.id,
      athleteId: String(post.athleteId || post.user.id),
      athleteName: post.user.username,
      athleteAvatarUrl: this.normalizeAvatarUrl(rawAvatar),
      mediaUrl: post.mediaUrl,
      modality: (post.user as any).modality || (post.user as any).modalidade,
      position: (post.user as any).position || (post.user as any).posicao || (post.user as any).cargoOuFuncao || profilePosition,
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

  onDrawerInvites(): void {
    this.menuController.close('profileMenu');
    this.openInvitesSheet();
  }

  onDrawerEditProfile(): void {
    this.menuController.close('profileMenu');
    this.router.navigateByUrl('/profile-player');
  }

  onDrawerBlockedUsers(): void {
    this.menuController.close('profileMenu');
    this.router.navigateByUrl('/usuarios-bloqueados');
  }

  openBlockedUsers(): void {
    this.router.navigateByUrl('/usuarios-bloqueados');
  }

  onDrawerSignOut(): void {
    this.menuController.close('profileMenu');
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onDrawerDeleteAccount(): void {
    this.menuController.close('profileMenu');
    this.openDeleteAccountOptions();
  }

  editPlayerProfile(): void {
    this.router.navigateByUrl('/profile-player');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  async openDeleteAccountOptions() {
    const actionSheet = await this.actionSheetController.create({
      cssClass: 'be-action-sheet',
      buttons: [
        {
          text: 'Excluir conta',
          role: 'destructive',
          icon: trashOutline,
          handler: () => {
            this.confirmDeleteAccount();
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel',
          icon: closeOutline
        }
      ]
    });
    await actionSheet.present();
  }

  async confirmDeleteAccount() {
    const alert = await this.alertController.create({
      header: 'Excluir sua conta?',
      message: 'Esta ação é permanente. Sua conta, vídeos, conversas e todos os seus dados serão removidos em um processamento que pode levar algum tempo para ser concluído.',
      cssClass: 'be-alert-confirm',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir conta',
          role: 'destructive',
          handler: () => {
            this.deleteAccount();
          }
        }
      ]
    });
    await alert.present();
  }

  private deleteAccount(): void {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    const userId = decodedToken?.userId;

    if (!userId) {
      this.showToast('Não foi possível identificar sua conta. Tente novamente.', 'danger');
      return;
    }

    this.profileService.requestAccountDeletion(userId).subscribe({
      next: async () => {
        this.authService.logout();
        this.router.navigate(['/login']);
        const toast = await this.toastController.create({
          message: 'Recebemos sua solicitação. Sua conta e todos os seus dados serão excluídos em breve. Obrigado por ter feito parte da nossa comunidade!',
          duration: 6000,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();
      },
      error: (err) => {
        console.error('Error requesting account deletion', err);
        this.showToast('Não foi possível processar a exclusão da conta. Tente novamente mais tarde.', 'danger');
      }
    });
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

  async openInvitesSheet(postId?: string): Promise<void> {
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
      color: 'warning',
      position: 'bottom'
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
  }
}
