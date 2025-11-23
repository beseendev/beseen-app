import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonAvatar, IonIcon, IonButton, IonLabel, IonItem } from '@ionic/angular/standalone';
import { Post } from '../../models/post.model';
import { addIcons } from 'ionicons';
import { heart, heartOutline, chatbubbleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-post-card',
  templateUrl: './post-card.component.html',
  styleUrls: ['./post-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonCard, IonAvatar, IonIcon, IonButton, IonLabel, IonItem]
})
export class PostCardComponent {
  @Input() post!: Post;

  constructor() {
    addIcons({ heart, heartOutline, chatbubbleOutline });
  }

  toggleLike() {
    this.post.isLiked = !this.post.isLiked;
    this.post.isLiked ? this.post.likes++ : this.post.likes--;
  }
}
