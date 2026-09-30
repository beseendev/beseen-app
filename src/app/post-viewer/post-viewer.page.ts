import { CommonModule } from '@angular/common';
import { combineLatest } from 'rxjs';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonButton, ModalController, IonContent, IonIcon, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, chatbubbleEllipsesOutline, flagOutline, heart, heartOutline, volumeHigh, volumeMute } from 'ionicons/icons';
import { environment } from '../../environments/environment';
import { openCommentsSheet } from '../components/comments-sheet/comments-sheet.component';
import { PlayerCardComponent } from '../components/player-card/player-card.component';
import { Post } from '../models/post.model';
import { Profile } from '../models/profile.model';
import { AuthService, JwtPayload } from '../services/auth.service';
import { PostService } from '../services/post.service';
import { ViewportVideoPlayerDirective } from '../shared/directives/viewport-video-player.directive';

@Component({
  selector: 'app-post-viewer',
  templateUrl: './post-viewer.page.html',
  styleUrls: ['./post-viewer.page.scss'],
  standalone: true,
  imports: [CommonModule, IonButton, IonContent, IonIcon, IonSpinner, PlayerCardComponent, ViewportVideoPlayerDirective]
})
export class PostViewerPage implements OnInit, OnDestroy {
  post: Post | null = null;
  isLoading = true;
  // my-posts só devolve posts do próprio usuário; o endpoint público do compartilhamento deve mudar isso
  isMine = true;
  showLikeBurst = false;
  private likeBurstTimeout?: ReturnType<typeof setTimeout>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly postService = inject(PostService);
  private readonly authService = inject(AuthService);
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);
  private readonly modalController = inject(ModalController);

  constructor() {
    addIcons({ arrowBackOutline, chatbubbleEllipsesOutline, flagOutline, heart, heartOutline, volumeHigh, volumeMute });
  }

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([params, query]) =>
      this.loadPost(params.get('id'), query.get('comments') === '1')
    );
  }

  private loadPost(postId: string | null, openCommentsOnLoad = false): void {
    if (!postId) {
      this.handleUnavailable();
      return;
    }

    this.isLoading = true;
    this.post = null;
    this.postService.getMyPostById(postId).subscribe({
      next: post => {
        this.post = post;
        this.isLoading = false;
        if (openCommentsOnLoad) {
          this.openComments();
        }
      },
      error: err => {
        console.error('Error loading post', err);
        this.handleUnavailable();
      }
    });
  }

  openComments(): void {
    const post = this.post;
    if (!post) {
      return;
    }
    openCommentsSheet(this.modalController, post.id, post.commentsCount, count => (post.commentsCount = count));
  }

  toggleLike(): void {
    const post = this.post;
    if (!post) {
      return;
    }

    const previousIsLiked = post.isLiked;
    const previousLikes = post.likesCount;

    post.isLiked = !post.isLiked;
    post.likesCount = post.isLiked ? previousLikes + 1 : Math.max(0, previousLikes - 1);

    const action = previousIsLiked ? this.postService.unlikePost(post.id) : this.postService.likePost(post.id);
    action.subscribe({
      error: err => {
        post.isLiked = previousIsLiked;
        post.likesCount = previousLikes;
        console.error('Error toggling like', err);
      }
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.likeBurstTimeout);
  }

  onDoubleTapLike(): void {
    const post = this.post;
    if (post && !post.isLiked) {
      post.isLiked = true;
      post.likesCount = post.likesCount + 1;

      this.postService.likePost(post.id).subscribe({
        error: err => {
          post.isLiked = false;
          post.likesCount = Math.max(0, post.likesCount - 1);
          console.error('Error liking video on double tap', err);
        }
      });
    }

    this.showLikeBurst = false;
    clearTimeout(this.likeBurstTimeout);
    setTimeout(() => {
      this.showLikeBurst = true;
      this.likeBurstTimeout = setTimeout(() => (this.showLikeBurst = false), 700);
    });
  }

  get playerCardProfile(): Partial<Profile> {
    const user = this.post?.user;
    const position = user?.position || this.post?.position;
    return {
      name: user?.username,
      urlProfileImage: this.normalizeAvatarUrl(user?.urlPerfil ?? null),
      positions: position ? [position] : undefined
    };
  }

  openAthleteProfile(): void {
    if (!this.post) {
      return;
    }

    if (this.isMine) {
      this.router.navigateByUrl('/profile-player');
      return;
    }

    this.router.navigate(['/profile-player', this.post.athleteId || this.post.user.id]);
  }

  async reportPost(): Promise<void> {
    const post = this.post;
    if (!post) {
      return;
    }

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
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Denunciar',
          cssClass: 'be-danger-btn',
          handler: (data: { reason: string }) => {
            if (!data.reason?.trim()) {
              this.showToast('Por favor, descreva o motivo da denúncia.', 'warning');
              return false;
            }

            this.postService.reportPost(post.id, data.reason).subscribe({
              next: () => this.showToast('Denúncia enviada com sucesso. Obrigado por nos ajudar a manter a comunidade segura!', 'success'),
              error: err => {
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

  goBack(): void {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    const isClube = decodedToken?.role === 'CLUBE';
    this.router.navigateByUrl(isClube ? '/scout-home' : '/player-home', { replaceUrl: true });
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 3000, color, position: 'top' });
    await toast.present();
  }

  private normalizeAvatarUrl(rawUrl: string | null): string | null {
    const url = rawUrl?.trim();
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
      return `${baseApiUrl.replace(/\/beseen\/api$/, '')}${url}`;
    }

    return baseApiUrl ? `${baseApiUrl}/${url.replace(/^\/+/, '')}` : url;
  }

  private async handleUnavailable(): Promise<void> {
    this.isLoading = false;
    const toast = await this.toastController.create({
      message: 'Esse vídeo não está mais disponível.',
      duration: 2500,
      color: 'medium'
    });
    await toast.present();
    this.goBack();
  }
}
