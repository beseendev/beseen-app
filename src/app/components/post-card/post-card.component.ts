import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonAvatar, IonIcon, IonButton, IonLabel, IonItem } from '@ionic/angular/standalone';
import { Post } from '../../models/post.model';
import { addIcons } from 'ionicons';
import { football, footballOutline, chatbubbleOutline } from 'ionicons/icons';
import { FileType } from '../../models/upload.model';

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

  constructor() {
    addIcons({ football, footballOutline, chatbubbleOutline });
  }

  toggleLike() {
    this.post.isLiked = !this.post.isLiked;
    this.post.isLiked ? this.post.likesCount++ : this.post.likesCount--;
  }
}
