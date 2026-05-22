import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonAvatar, IonIcon, IonButton, IonLabel, IonItem, IonBadge } from '@ionic/angular/standalone';
import { Advertisement } from '../../models/advertisement.model';
import { addIcons } from 'ionicons';
import { megaphoneOutline, openOutline, starOutline } from 'ionicons/icons';
import { ViewportVideoPlayerDirective } from '../../shared/directives/viewport-video-player.directive';

@Component({
  selector: 'app-ad-card',
  templateUrl: './ad-card.component.html',
  styleUrls: ['./ad-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon, IonButton, IonBadge, ViewportVideoPlayerDirective]
})
export class AdCardComponent {
  @Input() ad!: Advertisement;

  constructor() {
    addIcons({ megaphoneOutline, openOutline, starOutline });
  }

  goToSite() {
    if (this.ad.siteLink) {
      window.open(this.ad.siteLink, '_blank');
    }
  }
}
