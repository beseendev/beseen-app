import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonAvatar, IonIcon, IonButton, IonLabel, IonItem, ToastController } from '@ionic/angular/standalone'; // Added ToastController
import { Post } from '../../models/post.model';
import { addIcons } from 'ionicons';
import { football, footballOutline, chatbubbleOutline } from 'ionicons/icons';
import { FileType } from '../../models/upload.model';
import { PostService } from '../../services/post.service'; // Added PostService

@Component({
  selector: 'app-post-card',
  templateUrl: './post-card.component.html',
  styleUrls: ['./post-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonCard, IonAvatar, IonIcon, IonButton, IonLabel, IonItem]
})
export class PostCardComponent {
  @Input() post!: Post;
  public FileType = FileType;

  private postService = inject(PostService); // Injected PostService
  private toastCtrl = inject(ToastController); // Injected ToastController

  constructor() {
    addIcons({ football, footballOutline, chatbubbleOutline });
  }

  async toggleLike() { // Made async for toastController
    const previousIsLiked = this.post.isLiked;
    const previousLikesCount = this.post.likesCount; // Keep for error reversion

    // Optimistic UI update (only isLiked, likesCount will be updated by PostService)
    this.post.isLiked = !this.post.isLiked;

    const operation = previousIsLiked ? this.postService.unlikePost(this.post.id) : this.postService.likePost(this.post.id);

    operation.subscribe({
      next: async () => {
        // No action needed here, PostService's tap operator updates the likesCount
      },
      error: async (err) => {
        // Revert UI on error
        this.post.isLiked = previousIsLiked;
        this.post.likesCount = previousLikesCount; // Revert likesCount as well on error
        const toast = await this.toastCtrl.create({
          message: `Erro ao ${previousIsLiked ? 'descurtir' : 'curtir'} o post: ${err.message || 'Tente novamente.'}`,
          duration: 2000,
          color: 'danger'
        });
        await toast.present();
        console.error('Error toggling like:', err);
      }
    });
  }
}