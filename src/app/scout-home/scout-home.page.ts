import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { IonicModule, ModalController, PopoverController, ToastController, IonInfiniteScroll, AlertController, ActionSheetController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { filter, finalize, take } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import {
  chatbubbleEllipsesOutline,
  logOutOutline,
  createOutline,
  personCircleOutline,
  star,
  starOutline,
  locationOutline,
  cardOutline,
  helpCircleOutline,
  volumeHighOutline,
  volumeMuteOutline, flagOutline,
  banOutline,
  trashOutline,
  closeOutline,
  funnelOutline,
  search,
  searchOutline,
} from 'ionicons/icons';
import { FavoriteAthleteVideoCard } from '../models/chat.models';
import { Post } from '../models/post.model';
import { Advertisement } from '../models/advertisement.model';
import { ScoutProfile } from '../models/scout-profile.model';
import { FileType } from '../models/upload.model';
import { AuthService, JwtPayload } from '../services/auth.service';
import { PostService } from '../services/post.service';
import { ProfileService } from '../services/profile.service';
import { ChatService } from '../services/chat.service';
import { AdvertisementService } from '../services/advertisement.service';
import { SubscriptionService } from '../services/subscription.service';
import { ChatInboxComponent } from '../components/chat-inbox/chat-inbox.component';
import { ChatSheetComponent } from '../components/chat-sheet/chat-sheet.component';
import { ScoutFavoritesTabComponent } from './components/scout-favorites-tab/scout-favorites-tab.component';
import { AdCardComponent } from '../components/ad-card/ad-card.component';
import { ApiService } from "../services/api.service";
import { environment } from "../../environments/environment";
import { ModalStateService } from '../services/modal-state.service';
import { ViewportVideoPlayerDirective } from '../shared/directives/viewport-video-player.directive';
import { ScoutSearchService } from '../services/scout-search.service';
import { ScoutFilterModalComponent } from './components/scout-filter-modal/scout-filter-modal.component';
import {
  ScoutVideoFilterChip,
  ScoutVideoFilters,
  removeScoutVideoFilter
} from '../models/scout-search.model';

export type ScoutFeedItem = { type: 'video', video: FavoriteAthleteVideoCard } | { type: 'ad', ad: Advertisement };

@Component({
  selector: 'app-scout-home',
  templateUrl: './scout-home.page.html',
  styleUrls: ['./scout-home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ScoutFavoritesTabComponent, AdCardComponent, ViewportVideoPlayerDirective]
})
export class ScoutHomePage implements OnInit, OnDestroy {
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;

  videoPosts: Post[] = [];
  selectedTab: 'vitrine' | 'favoritos' = 'vitrine';
  scoutProfile: ScoutProfile | null = null;
  isLoadingContent = true;
  userProfile: any | null = null;
  avatarLoadFailed = false;
  isLoading = true;
  activeChatCount = 0;
  private favoritesNextCursor: string | null = null;

  private homePostsSub!: Subscription;
  private threadsSub!: Subscription;
  private tabLoadSub?: Subscription;

  feedItems: ScoutFeedItem[] = [];
  userRole: string | null = null;
  activeFilterCount = 0;
  activeFilterChips: ScoutVideoFilterChip[] = [];
  isScoutSearchLoading = false;
  scoutSearchHasMore = false;

  get userName(): string {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    return decodedToken?.name || 'Clube';
  }

  get scoutType(): string | null {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    return decodedToken?.scoutType || null;
  }

  get isScoutUser(): boolean {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    return this.userRole === 'CLUBE' || decodedToken?.role === 'CLUBE';
  }

  private readonly postService = inject(PostService);
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly adService = inject(AdvertisementService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly modalService = inject(ModalStateService);
  private readonly scoutSearchService = inject(ScoutSearchService);
  private readonly modalController = inject(ModalController);
  private readonly alertController = inject(AlertController);
  public readonly popoverController = inject(PopoverController);
  private readonly toastController = inject(ToastController);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);
  private scoutResultsSub?: Subscription;
  private scoutLoadingSub?: Subscription;
  private scoutHasMoreSub?: Subscription;
  private scoutFilterCountSub?: Subscription;
  private scoutFilterChipsSub?: Subscription;

  constructor() {
    addIcons({
      chatbubbleEllipsesOutline,
      logOutOutline,
      createOutline,
      personCircleOutline,
      star,
      starOutline,
      locationOutline,
      cardOutline,
      helpCircleOutline,
      volumeHighOutline,
      volumeMuteOutline,
      flagOutline,
      banOutline,
      trashOutline,
      closeOutline,
      funnelOutline,
      search,
      searchOutline

    });
  }

  async reportVideo(card: FavoriteAthleteVideoCard) {
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

            this.postService.reportPost(card.postId, data.reason).subscribe({
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

  async openPlans() {
    return await this.modalService.openPlansModal();
  }

  openBlockedUsers() {
    this.router.navigate(['/usuarios-bloqueados']);
  }

  openSupport() {
    this.router.navigate(['/suporte']);
  }

  goToAthleteSearch(): void {
    this.router.navigateByUrl('/scout-athlete-search');
  }

  async ngOnInit(): Promise<void> {
    this.userRole = this.authService.getDecodedToken<JwtPayload>()?.role || null;

    this.authService.userRole$.subscribe(role => {
      this.userRole = role;
    });

    this.homePostsSub = this.postService.homePosts$.subscribe(async posts => {
      if (this.selectedTab === 'vitrine' && !this.hasActiveScoutFilters) {
        this.videoPosts = posts.filter(p => p.mediaType === FileType.VIDEO);
        this.isLoadingContent = false;
        await this.updateFeedItems();
      }
    });

    this.scoutResultsSub = this.scoutSearchService.results$.subscribe(async posts => {
      if (this.selectedTab === 'vitrine' && this.hasActiveScoutFilters) {
        this.videoPosts = posts;
        this.isLoadingContent = this.isScoutSearchLoading && posts.length === 0;
        await this.updateFeedItems();
      }
    });

    this.scoutLoadingSub = this.scoutSearchService.loading$.subscribe(loading => {
      this.isScoutSearchLoading = loading;
      if (this.selectedTab === 'vitrine' && this.hasActiveScoutFilters) {
        this.isLoadingContent = loading && this.videoPosts.length === 0;
      }
    });

    this.scoutHasMoreSub = this.scoutSearchService.hasMore$.subscribe(hasMore => {
      this.scoutSearchHasMore = hasMore;
    });

    this.scoutFilterCountSub = this.scoutSearchService.activeCount$.subscribe(count => {
      this.activeFilterCount = count;
    });

    this.scoutFilterChipsSub = this.scoutSearchService.activeChips$.subscribe(chips => {
      this.activeFilterChips = chips;
    });

    this.threadsSub = this.chatService.threads$.subscribe(threads => {
      this.activeChatCount = threads.length;
    });

    if (this.subscriptionService.canAccessChat()) {
      this.chatService.loadThreads().subscribe();
    }

    this.refreshCurrentTab();
  }

  private async updateFeedItems() {
    const cards = this.selectedTab === 'vitrine' ? this.allVideoCards : this.favoriteVideoCards;
    this.feedItems = await this.interleaveAds(cards);
  }

  private async interleaveAds(cards: FavoriteAthleteVideoCard[]): Promise<ScoutFeedItem[]> {
    const result: ScoutFeedItem[] = [];
    for (let i = 0; i < cards.length; i++) {
      result.push({ type: 'video', video: cards[i] });
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

  ngOnDestroy(): void {
    if (this.homePostsSub) {
      this.homePostsSub.unsubscribe();
    }
    if (this.threadsSub) {
      this.threadsSub.unsubscribe();
    }
    this.scoutResultsSub?.unsubscribe();
    this.scoutLoadingSub?.unsubscribe();
    this.scoutHasMoreSub?.unsubscribe();
    this.scoutFilterCountSub?.unsubscribe();
    this.scoutFilterChipsSub?.unsubscribe();
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
  }

  setActiveTab(tab: 'vitrine' | 'favoritos'): void {
    if (this.selectedTab === tab) return;

    this.selectedTab = tab;

    if (this.infiniteScroll) {
      this.infiniteScroll.disabled = false;
    }

    this.refreshCurrentTab();
  }

  async refreshCurrentTab(): Promise<void> {
    if (this.tabLoadSub) {
      this.tabLoadSub.unsubscribe();
    }

    this.isLoadingContent = true;
    if (this.selectedTab === 'vitrine') {
      if (this.hasActiveScoutFilters) {
        this.videoPosts = this.scoutSearchService.currentResults;
        this.isLoadingContent = this.isScoutSearchLoading && this.videoPosts.length === 0;
        await this.updateFeedItems();
        if (this.videoPosts.length === 0 && !this.isScoutSearchLoading) {
          this.scoutSearchService.reload();
        }
      } else {
        this.tabLoadSub = this.postService.refreshHomePosts().subscribe();
      }
    } else {
      this.favoritesNextCursor = null;
      this.tabLoadSub = this.postService.getFavoritePosts(10).subscribe({
        next: async (response) => {
          this.videoPosts = response.posts.filter(p => p.mediaType === FileType.VIDEO);
          this.favoritesNextCursor = response.nextCursor;
          this.isLoadingContent = false;
          await this.updateFeedItems();
        },
        error: (err) => {
          console.error('Error loading favorite posts', err);
          this.isLoadingContent = false;
        }
      });
    }
  }

  private normalizeAvatarUrl(rawUrl: string | null): string | null {
    if (!rawUrl) return null;
    const url = rawUrl.trim();
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    const baseApiUrl = environment.apiUrl;
    if (url.startsWith('/') && baseApiUrl) {
      const baseOrigin = baseApiUrl.replace(/\/beseen\/api$/, '');
      return `${baseOrigin}${url}`;
    }
    return baseApiUrl ? `${baseApiUrl}/${url.replace(/^\/+/, '')}` : url;
  }

  get allVideoCards(): FavoriteAthleteVideoCard[] {
    return this.videoPosts.map(post => this.toVideoCard(post));
  }

  get favoriteVideoCards(): FavoriteAthleteVideoCard[] {
    return this.allVideoCards.filter(card => card.favorito);
  }

  get hasActiveScoutFilters(): boolean {
    return this.activeFilterCount > 0;
  }

  shouldShowConversationAction(card: FavoriteAthleteVideoCard): boolean {
    return card.inviteStatus === 'ACCEPTED' || this.subscriptionService.canSendInvites();
  }

  async toggleFavoriteFromCard(card: FavoriteAthleteVideoCard): Promise<void> {
    const isCurrentlyFavorite = card.favorito;
    const postId = card.postId;

    const action = isCurrentlyFavorite
      ? this.postService.unlikePost(postId)
      : this.postService.likePost(postId);

    action.subscribe({
      next: async () => {
        if (this.selectedTab === 'vitrine' && this.hasActiveScoutFilters) {
          this.scoutSearchService.updatePostFavoriteState(postId, !isCurrentlyFavorite);
          this.videoPosts = this.scoutSearchService.currentResults;
        }
        if (isCurrentlyFavorite && this.selectedTab === 'favoritos') {
          this.videoPosts = this.videoPosts.filter(p => p.id !== postId);
        }
        await this.updateFeedItems();
      },
      error: (err) => console.error('Error toggling favorite', err)
    });
  }

  sendInvite(card: FavoriteAthleteVideoCard): void {
    if (!this.subscriptionService.canSendInvites()) {
        this.showToast('Seu plano atual não permite enviar convites. Faça um upgrade!', 'warning');
        this.openPlans();
        return;
    }

    if (!this.subscriptionService.canSendMoreInvites(this.activeChatCount)) {
        this.showToast('Seu plano atual (Contato) permite o envio de até 2 convites, e esse limite já foi alcançado', 'warning');
        this.openPlans();
        return;
    }

    card.isInviting = true;
    this.postService.sendInvite(card.postId).pipe(
      finalize(() => card.isInviting = false)
    ).subscribe({
      next: () => {
        card.inviteStatus = 'PENDING';
        const post = this.videoPosts.find(p => p.id === card.postId);
        if (post) {
          post.inviteStatus = 'PENDING';
        }
        if (this.selectedTab === 'vitrine' && this.hasActiveScoutFilters) {
          this.scoutSearchService.updatePostInviteState(card.postId, 'PENDING');
        }
      }
    });
  }

  async openChat(card: FavoriteAthleteVideoCard): Promise<void> {
    if (!this.subscriptionService.canAccessChat()) {
        this.showToast('Seu plano atual não permite acessar o chat. Faça um upgrade!', 'warning');
        this.openPlans();
        return;
    }

    if (card.inviteStatus !== 'ACCEPTED') return;

    const threads = await firstValueFrom(this.chatService.threads$);
    const thread = threads.find(t => t.counterpartName === card.athleteName);

    if (thread) {
      const modal = await this.modalController.create({
        component: ChatSheetComponent,
        componentProps: {
          threadId: thread.chatThreadId,
          inviteId: thread.inviteId,
          counterpartName: thread.counterpartName,
          counterpartAvatarUrl: thread.counterpartAvatar,
          counterpartProfileId: thread.counterpartProfileId ?? null,
          counterpartBlocked: thread.counterpartBlocked ?? false,
          status: thread.status,
          isPlayer: false
        },
        breakpoints: [0, 0.4, 1],
        initialBreakpoint: 1,
        backdropBreakpoint: 0.4,
        handle: true,
        canDismiss: true
      });
      await modal.present();
    } else {
      this.openChatInbox();
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'medium' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 4000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }


  editScoutProfile(): void {
    this.router.navigate(['/profile-scout']);
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
      message: 'Esta ação é permanente. Sua conta, favoritos, conversas e todos os seus dados serão removidos em um processamento que pode levar algum tempo para ser concluído.',
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

  openAthleteProfile(card: FavoriteAthleteVideoCard): void {
    if (!this.subscriptionService.canViewProfiles()) {
        this.showToast('Seu plano atual não permite visualizar perfis detalhados. Faça um upgrade!', 'warning');
        this.openPlans();
        return;
    }
    this.router.navigate(['/profile-player', card.athleteId]);
  }

  async openChatInbox(): Promise<void> {
    if (!this.subscriptionService.canAccessChat()) {
        this.showToast('Seu plano atual não permite acessar o chat. Faça um upgrade!', 'warning');
        this.openPlans();
        return;
    }

    const modal = await this.modalController.create({
      component: ChatInboxComponent,
      componentProps: {
        isPlayer: false
      },
      breakpoints: [0, 0.45, 0.8, 0.95],
      initialBreakpoint: 0.8,
      backdropBreakpoint: 0.45,
      canDismiss: true,
      handle: true
    });
    await modal.present();
  }

  private toVideoCard(post: Post): FavoriteAthleteVideoCard {
    return {
      postId: post.id,
      athleteId: String(post.athleteId || post.user.id),
      athleteName: post.user.username,
      athleteAvatarUrl: post.user.urlPerfil ?? null,
      mediaUrl: post.mediaUrl,
      caption: post.caption,
      modalidade: (post.user as any).modality,
      position: (post.user as any).position || (post.user as any).posicao || (post.user as any).cargoOuFuncao,
      localidade: (post.user as any).region,
      destaque: post.caption,
      favorito: post.isLiked,
      likes: post.likesCount,
      inviteStatus: post.inviteStatus
    };
  }

  trackByVideoCard(_: number, item: ScoutFeedItem): string {
    return item.type === 'video' ? item.video.postId : `ad-${item.ad.id}`;
  }

  async openScoutFilters(): Promise<void> {
    const modal = await this.modalController.create({
      component: ScoutFilterModalComponent,
      componentProps: {
        filters: this.scoutSearchService.currentFilters
      },
      breakpoints: [0, 0.55, 0.9, 1],
      initialBreakpoint: 0.9,
      backdropBreakpoint: 0.55,
      canDismiss: true,
      handle: true,
      cssClass: 'scout-filter-modal-sheet'
    });

    await modal.present();
    const result = await modal.onDidDismiss<ScoutVideoFilters>();

    if (result.role === 'apply' && result.data) {
      this.applyScoutFilters(result.data);
    }
  }

  applyScoutFilters(filters: ScoutVideoFilters): void {
    this.scoutSearchService.applyFilters(filters);
    if (this.infiniteScroll) {
      this.infiniteScroll.disabled = false;
    }

    if (!this.scoutSearchService.hasActiveFilters) {
      this.refreshCurrentTab();
    }
  }

  removeScoutFilter(chip: ScoutVideoFilterChip): void {
    const nextFilters = removeScoutVideoFilter(this.scoutSearchService.currentFilters, chip.id);
    this.applyScoutFilters(nextFilters);
  }

  clearScoutFilters(): void {
    this.scoutSearchService.clearFilters();
    if (this.infiniteScroll) {
      this.infiniteScroll.disabled = false;
    }
    this.refreshCurrentTab();
  }

  refreshPosts(event: any): void {
    if (this.tabLoadSub) {
      this.tabLoadSub.unsubscribe();
    }

    if (this.selectedTab === 'vitrine') {
      if (this.hasActiveScoutFilters) {
        this.scoutSearchService.reload();
        this.completeWhenScoutSearchSettles(event);
      } else {
        this.tabLoadSub = this.postService.refreshHomePosts().subscribe({
          next: async () => {
            this.finalizeLoad(event);
            if (this.infiniteScroll) {
              this.infiniteScroll.disabled = false;
            }
            await this.updateFeedItems();
          },
          error: () => this.finalizeLoad(event)
        });
      }
    } else {
      this.favoritesNextCursor = null;
      this.tabLoadSub = this.postService.getFavoritePosts(10).subscribe({
        next: async (response) => {
          this.videoPosts = response.posts.filter(p => p.mediaType === FileType.VIDEO);
          this.favoritesNextCursor = response.nextCursor;
          this.isLoadingContent = false;
          await this.updateFeedItems();
        },
        error: (err) => {
          console.error('Error loading favorite posts', err);
          this.isLoadingContent = false;
          this.finalizeLoad(event);
        }
      });
    }
  }

  loadMorePosts(event: any): void {
    if (this.selectedTab === 'vitrine') {
      if (this.hasActiveScoutFilters) {
        this.scoutSearchService.loadMore();
        this.completeWhenScoutSearchSettles(event);
      } else {
        this.tabLoadSub = this.postService.loadHomePosts().subscribe({
          next: async (res) => {
            this.finalizeLoad(event, res && res.posts && res.posts.length === 0);
            await this.updateFeedItems();
          },
          error: () => this.finalizeLoad(event)
        });
      }
    } else if (this.selectedTab === 'favoritos' && this.favoritesNextCursor) {
      this.tabLoadSub = this.postService.getFavoritePosts(10, this.favoritesNextCursor).subscribe({
        next: async (response) => {
          const newVideos = response.posts.filter(p => p.mediaType === FileType.VIDEO);
          const existingIds = new Set(this.videoPosts.map(p => p.id));
          const filteredNew = newVideos.filter(p => !existingIds.has(p.id));

          this.videoPosts = [...this.videoPosts, ...filteredNew];
          this.favoritesNextCursor = response.nextCursor;
          this.finalizeLoad(event, !response.nextCursor);
          await this.updateFeedItems();
        },
        error: () => this.finalizeLoad(event)
      });
    } else {
      this.finalizeLoad(event, true);
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

  private completeWhenScoutSearchSettles(event: any): void {
    this.scoutSearchService.loading$.pipe(
      filter(loading => !loading),
      take(1)
    ).subscribe(() => {
      this.finalizeLoad(event, !this.scoutSearchHasMore);
    });
  }
}
