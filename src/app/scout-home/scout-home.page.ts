import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { IonicModule, ModalController, ToastController, IonInfiniteScroll } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  chatbubbleEllipsesOutline,
  logOutOutline,
  heart,
  heartOutline,
  createOutline,
  personCircleOutline,
  starOutline,
  locationOutline
} from 'ionicons/icons';
import { FavoriteAthleteVideoCard } from '../models/chat.models';
import { Post } from '../models/post.model';
import { ScoutProfile } from '../models/scout-profile.model';
import { FileType } from '../models/upload.model';
import { AuthService, JwtPayload } from '../services/auth.service';
import { PostService } from '../services/post.service';
import { ChatService } from '../services/chat.service';
import { ChatInboxComponent } from '../components/chat-inbox/chat-inbox.component';
import { ChatSheetComponent } from '../components/chat-sheet/chat-sheet.component';
import { ScoutFavoritesTabComponent } from './components/scout-favorites-tab/scout-favorites-tab.component';
import { ApiService } from "../services/api.service";
import { environment } from "../../environments/environment";

@Component({
  selector: 'app-scout-home',
  templateUrl: './scout-home.page.html',
  styleUrls: ['./scout-home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ScoutFavoritesTabComponent]
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

  get userName(): string {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    return decodedToken?.name || 'Clube';
  }

  private readonly postService = inject(PostService);
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);

  constructor() {
    addIcons({
      chatbubbleEllipsesOutline,
      logOutOutline,
      heart,
      heartOutline,
      createOutline,
      personCircleOutline,
      starOutline,
      locationOutline
    });
  }

  async ngOnInit(): Promise<void> {

    // Inscreve-se no stream de posts da home
    this.homePostsSub = this.postService.homePosts$.subscribe(posts => {
      if (this.selectedTab === 'vitrine') {
        this.videoPosts = posts.filter(p => p.mediaType === FileType.VIDEO);
        this.isLoadingContent = false;
      }
    });

    this.threadsSub = this.chatService.threads$.subscribe(threads => {
      this.activeChatCount = threads.length;
    });

    this.chatService.loadThreads().subscribe();

    this.refreshCurrentTab();
  }

  ngOnDestroy(): void {
    if (this.homePostsSub) {
      this.homePostsSub.unsubscribe();
    }
    if (this.threadsSub) {
      this.threadsSub.unsubscribe();
    }
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

  refreshCurrentTab(): void {
    this.isLoadingContent = true;
    if (this.selectedTab === 'vitrine') {
      this.postService.refreshHomePosts().subscribe();
    } else {
      this.favoritesNextCursor = null;
      this.postService.getFavoritePosts(10).subscribe({
        next: (response) => {
          this.videoPosts = response.posts.filter(p => p.mediaType === FileType.VIDEO);
          this.favoritesNextCursor = response.nextCursor;
          this.isLoadingContent = false;
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
    // Na aba de favoritos, todos os cards já são favoritos,
    // mas mantemos o filtro por segurança ou para cards individuais na vitrine
    return this.allVideoCards.filter(card => card.favorito);
  }

  async toggleFavoriteFromCard(card: FavoriteAthleteVideoCard): Promise<void> {
    const isCurrentlyFavorite = card.favorito;
    const postId = card.postId;

    const action = isCurrentlyFavorite
      ? this.postService.unlikePost(postId)
      : this.postService.likePost(postId);

    action.subscribe({
      next: () => {
        this.showFavoriteToast(!isCurrentlyFavorite, card.athleteName);
        if (isCurrentlyFavorite && this.selectedTab === 'favoritos') {
          this.videoPosts = this.videoPosts.filter(p => p.id !== postId);
        }
      },
      error: (err) => console.error('Error toggling favorite', err)
    });
  }

  sendInvite(card: FavoriteAthleteVideoCard): void {
    this.postService.sendInvite(card.postId).subscribe({
      next: () => {
        this.showToast('Convite enviado com sucesso!', 'success');
        const post = this.videoPosts.find(p => p.id === card.postId);
        if (post) {
          post.inviteStatus = 'PENDING';
        }
      },
      error: (err) => {
        this.showToast('Erro ao enviar convite: ' + (err.error?.message || 'Tente novamente'), 'danger');
      }
    });
  }

  async openChat(card: FavoriteAthleteVideoCard): Promise<void> {
    if (card.inviteStatus !== 'ACCEPTED') return;

    const threads = await firstValueFrom(this.chatService.threads$);
    // Tenta encontrar a thread pelo nome do atleta (já que não temos o threadId no card)
    const thread = threads.find(t => t.counterpartName === card.athleteName);

    if (thread) {
      const modal = await this.modalController.create({
        component: ChatSheetComponent,
        componentProps: {
          threadId: thread.chatThreadId,
          inviteId: thread.inviteId,
          counterpartName: thread.counterpartName,
          counterpartAvatarUrl: thread.counterpartAvatar,
          status: thread.status,
          isPlayer: false
        },
        breakpoints: [0, 0.35, 0.7, 0.95],
        initialBreakpoint: 0.7,
        backdropBreakpoint: 0.35,
        handle: true,
        canDismiss: true
      });
      await modal.present();
    } else {
      // Se não encontrou no cache, abre a inbox para o usuário selecionar
      this.openChatInbox();
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'medium' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  private async showFavoriteToast(isAdded: boolean, athleteName: string): Promise<void> {
    this.showToast(isAdded
      ? `${athleteName} adicionado aos favoritos`
      : `${athleteName} removido dos favoritos`, isAdded ? 'success' : 'medium');
  }

  editScoutProfile(): void {
    this.router.navigate(['/profile-scout']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  openAthleteProfile(card: FavoriteAthleteVideoCard): void {
    this.router.navigate(['/profile-player', card.athleteId]);
  }

  async openChatInbox(): Promise<void> {
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
      localidade: (post.user as any).region,
      destaque: post.caption,
      favorito: post.isLiked,
      likes: post.likesCount,
      inviteStatus: post.inviteStatus
    };
  }

  trackByVideoCard(_: number, card: FavoriteAthleteVideoCard): string {
    return card.postId;
  }

  refreshPosts(event: any): void {
    if (this.selectedTab === 'vitrine') {
      this.postService.refreshHomePosts().subscribe({
        next: () => {
          this.finalizeLoad(event);
          if (this.infiniteScroll) {
            this.infiniteScroll.disabled = false;
          }
        },
        error: () => this.finalizeLoad(event)
      });
    } else {
      this.favoritesNextCursor = null;
      this.postService.getFavoritePosts(10).subscribe({
        next: (response) => {
          this.videoPosts = response.posts.filter(p => p.mediaType === FileType.VIDEO);
          this.favoritesNextCursor = response.nextCursor;
          this.finalizeLoad(event, !response.nextCursor);
          if (this.infiniteScroll) {
            this.infiniteScroll.disabled = !response.nextCursor;
          }
        },
        error: () => this.finalizeLoad(event)
      });
    }
  }

  loadMorePosts(event: any): void {
    if (this.selectedTab === 'vitrine') {
      this.postService.loadHomePosts().subscribe({
        next: (res) => {
          this.finalizeLoad(event, res && res.posts && res.posts.length === 0);
        },
        error: () => this.finalizeLoad(event)
      });
    } else if (this.selectedTab === 'favoritos' && this.favoritesNextCursor) {
      this.postService.getFavoritePosts(10, this.favoritesNextCursor).subscribe({
        next: (response) => {
          const newVideos = response.posts.filter(p => p.mediaType === FileType.VIDEO);
          this.videoPosts = [...this.videoPosts, ...newVideos];
          this.favoritesNextCursor = response.nextCursor;
          this.finalizeLoad(event, !response.nextCursor);
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
}
