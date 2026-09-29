import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonButton, IonContent, IonIcon, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, flagOutline, heart, heartOutline, volumeHigh, volumeMute } from 'ionicons/icons';
import { environment } from '../../environments/environment';
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
export class PostViewerPage implements OnInit {
  post: Post | null = null;
  isLoading = true;
  // my-posts só devolve posts do próprio usuário; o endpoint público do compartilhamento deve mudar isso
  isMine = true;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly postService = inject(PostService);
  private readonly authService = inject(AuthService);
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);

  constructor() {
    addIcons({ arrowBackOutline, flagOutline, heart, heartOutline, volumeHigh, volumeMute });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => this.loadPost(params.get('id')));
  }

  private loadPost(postId: string | null): void {
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
      },
      error: err => {
        console.error('Error loading post', err);
        this.handleUnavailable();
      }
    });
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
