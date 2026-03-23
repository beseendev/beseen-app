import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
import { AuthService } from '../services/auth.service';
import { PostService } from '../services/post.service';
import { ScoutFavoritesService } from '../services/scout-favorites.service';
import { ScoutProfileService } from '../services/scout-profile.service';
import { ChatUiService } from '../services/chat-ui.service';
import { ScoutChatInboxComponent } from './components/scout-chat-inbox/scout-chat-inbox.component';
import { ScoutFavoritesTabComponent } from './components/scout-favorites-tab/scout-favorites-tab.component';

interface ScoutTalent {
  id: string;
  nome: string;
  idadeCategoria: string;
  posicao: string;
  modalidade: string;
  localidade: string;
  destaque: string;
  favorito: boolean;
}

@Component({
  selector: 'app-scout-home',
  templateUrl: './scout-home.page.html',
  styleUrls: ['./scout-home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ScoutFavoritesTabComponent]
})
export class ScoutHomePage implements OnInit {
  talents: ScoutTalent[] = [];
  videoPosts: Post[] = [];
  selectedTab: 'vitrine' | 'favoritos' = 'vitrine';
  scoutProfile: ScoutProfile | null = null;
  isLoadingContent = true;

  private readonly favoritesService = inject(ScoutFavoritesService);
  private readonly postService = inject(PostService);
  private readonly scoutProfileService = inject(ScoutProfileService);
  private readonly chatUiService = inject(ChatUiService);
  private readonly authService = inject(AuthService);
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly router = inject(Router);

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
    this.scoutProfile = await this.scoutProfileService.getProfile();
    this.loadTalents();
    this.loadVideoPosts();
  }

  get favoriteCount(): number {
    return this.talents.filter(talent => talent.favorito).length;
  }

  get allVideoCards(): FavoriteAthleteVideoCard[] {
    return this.videoPosts.map(post => this.toVideoCard(post));
  }

  get favoriteVideoCards(): FavoriteAthleteVideoCard[] {
    return this.allVideoCards.filter(card => card.favorito);
  }

  get activeChatCount(): number {
    return Object.keys(this.chatUiService.getThreadsSnapshot()).length;
  }

  setActiveTab(tab: 'vitrine' | 'favoritos'): void {
    this.selectedTab = tab;
  }

  async toggleFavorite(talent: ScoutTalent): Promise<void> {
    const isNowFavorite = this.favoritesService.toggleFavorite(talent.id);
    talent.favorito = isNowFavorite;

    const toast = await this.toastController.create({
      message: isNowFavorite
        ? `${talent.nome} adicionado aos favoritos`
        : `${talent.nome} removido dos favoritos`,
      duration: 1800,
      color: isNowFavorite ? 'success' : 'medium',
      position: 'top'
    });

    await toast.present();
  }

  trackByTalent(_: number, talent: ScoutTalent): string {
    return talent.id;
  }

  trackByPost(_: number, post: Post): string {
    return post.id;
  }

  trackByVideoCard(_: number, card: FavoriteAthleteVideoCard): string {
    return card.postId;
  }

  async toggleFavoriteFromCard(card: FavoriteAthleteVideoCard): Promise<void> {
    const talent = this.talents.find(item => item.id === card.athleteId);
    if (!talent) {
      return;
    }

    await this.toggleFavorite(talent);
  }

  editScoutProfile(): void {
    this.router.navigate(['/scout-profile']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  openAthleteProfile(card: FavoriteAthleteVideoCard): void {
    this.router.navigate(['/profile', card.athleteId]);
  }

  async openChatInbox(): Promise<void> {
    const modal = await this.modalController.create({
      component: ScoutChatInboxComponent,
      breakpoints: [0, 0.45, 0.8, 0.95],
      initialBreakpoint: 0.8,
      backdropBreakpoint: 0.45,
      canDismiss: true,
      handle: true
    });

    await modal.present();
  }

  private loadTalents(): void {
    const favoriteIds = this.favoritesService.getFavorites();

    this.talents = [
      {
        id: 'talent-1',
        nome: 'Mateus Costa',
        idadeCategoria: 'Sub-17',
        posicao: 'Meia',
        modalidade: 'Futebol de campo',
        localidade: 'Florianopolis, SC',
        destaque: 'Visao de jogo e passe vertical',
        favorito: favoriteIds.includes('talent-1')
      },
      {
        id: 'talent-2',
        nome: 'Joao Pedro',
        idadeCategoria: 'Sub-20',
        posicao: 'Ponta',
        modalidade: 'Futebol 7',
        localidade: 'Curitiba, PR',
        destaque: 'Arranque curto e finalizacao rapida',
        favorito: favoriteIds.includes('talent-2')
      },
      {
        id: 'talent-3',
        nome: 'Lucas Ribeiro',
        idadeCategoria: 'Profissional',
        posicao: 'Volante',
        modalidade: 'Futsal',
        localidade: 'Porto Alegre, RS',
        destaque: 'Intensidade, cobertura e leitura defensiva',
        favorito: favoriteIds.includes('talent-3')
      },
      {
        id: 'talent-4',
        nome: 'Gabriel Santos',
        idadeCategoria: 'Sub-15',
        posicao: 'Atacante',
        modalidade: 'Futebol de campo',
        localidade: 'Sao Paulo, SP',
        destaque: 'Ataque ao espaco e boa definicao',
        favorito: favoriteIds.includes('talent-4')
      },
      {
        id: 'talent-5',
        nome: 'Henrique Souza',
        idadeCategoria: 'Sub-20',
        posicao: 'Lateral',
        modalidade: 'Futebol 7',
        localidade: 'Campinas, SP',
        destaque: 'Apoio ofensivo, cruzamento e retorno rapido',
        favorito: favoriteIds.includes('talent-5')
      },
      {
        id: 'talent-6',
        nome: 'Diego Fernandes',
        idadeCategoria: 'Sub-17',
        posicao: 'Goleiro',
        modalidade: 'Futebol de campo',
        localidade: 'Belo Horizonte, MG',
        destaque: 'Reflexo curto e reposicao rapida em transicao',
        favorito: favoriteIds.includes('talent-6')
      }
    ];
  }

  private loadVideoPosts(): void {
    this.postService.refreshHomePosts(20).pipe(
      catchError(error => {
        console.error('Failed to load scout videos from API, using fallback data', error);
        return of({
          posts: this.getFallbackVideoPosts(),
          nextCursor: null
        });
      })
    ).subscribe((response: { posts: Post[]; nextCursor: string | null }) => {
      const apiVideos = response.posts.filter((post: Post) => post.mediaType === FileType.VIDEO);
      this.videoPosts = this.mergeWithMockVideos(apiVideos, this.getMockVideoPosts());

      if (this.videoPosts.length === 0) {
        this.videoPosts = this.getFallbackVideoPosts();
      }

      this.isLoadingContent = false;
    });
  }

  private getFallbackVideoPosts(): Post[] {
    return [
      {
        id: 'video-1',
        user: { id: 'talent-1', username: 'Mateus Costa' },
        mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        mediaType: FileType.VIDEO,
        caption: 'Controle de bola e quebra de linha',
        likesCount: 18,
        commentsCount: 3,
        isLiked: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'video-2',
        user: { id: 'talent-2', username: 'Joao Pedro' },
        mediaUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        mediaType: FileType.VIDEO,
        caption: 'Finalizacao curta no Futebol 7',
        likesCount: 24,
        commentsCount: 5,
        isLiked: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'video-3',
        user: { id: 'talent-5', username: 'Henrique Souza' },
        mediaUrl: 'https://www.w3schools.com/html/movie.mp4',
        mediaType: FileType.VIDEO,
        caption: 'Ultrapassagem em velocidade e cruzamento no segundo pau',
        likesCount: 21,
        commentsCount: 4,
        isLiked: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'video-4',
        user: { id: 'talent-6', username: 'Diego Fernandes' },
        mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        mediaType: FileType.VIDEO,
        caption: 'Defesa curta e saida rapida para contra-ataque',
        likesCount: 27,
        commentsCount: 6,
        isLiked: false,
        createdAt: new Date().toISOString()
      }
    ];
  }

  private getMockVideoPosts(): Post[] {
    return [
      {
        id: 'video-mock-1',
        user: { id: 'talent-5', username: 'Henrique Souza' },
        mediaUrl: 'https://www.w3schools.com/html/movie.mp4',
        mediaType: FileType.VIDEO,
        caption: 'Apoio por fora com cruzamento rasteiro e recomposicao curta',
        likesCount: 19,
        commentsCount: 3,
        isLiked: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'video-mock-2',
        user: { id: 'talent-6', username: 'Diego Fernandes' },
        mediaUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        mediaType: FileType.VIDEO,
        caption: 'Reflexo em curta distancia e reposicao direta no ataque',
        likesCount: 26,
        commentsCount: 7,
        isLiked: false,
        createdAt: new Date().toISOString()
      }
    ];
  }

  private mergeWithMockVideos(apiVideos: Post[], mockVideos: Post[]): Post[] {
    const videosById = new Map<string, Post>();

    [...apiVideos, ...mockVideos].forEach(video => {
      videosById.set(video.id, video);
    });

    return Array.from(videosById.values());
  }

  private toVideoCard(post: Post): FavoriteAthleteVideoCard {
    const matchingTalent = this.talents.find(
      talent => talent.id === post.user.id || talent.nome === post.user.username
    );

    return {
      postId: post.id,
      athleteId: matchingTalent?.id ?? post.user.id,
      athleteName: matchingTalent?.nome ?? post.user.username,
      athleteAvatarUrl: post.user.urlPerfil ?? null,
      mediaUrl: post.mediaUrl,
      caption: post.caption,
      modalidade: matchingTalent?.modalidade ?? 'Talento em observacao',
      localidade: matchingTalent?.localidade ?? 'Local nao informado',
      destaque: matchingTalent?.destaque ?? (post.caption || 'Sem descricao adicional'),
      favorito: matchingTalent?.favorito ?? this.favoritesService.isFavorite(post.user.id)
    };
  }
}
