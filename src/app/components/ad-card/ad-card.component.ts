import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonAvatar, IonIcon, IonButton, IonLabel, IonItem, IonBadge } from '@ionic/angular/standalone';
import { Advertisement } from '../../models/advertisement.model';
import { addIcons } from 'ionicons';
import { megaphoneOutline, openOutline } from 'ionicons/icons';

@Component({
  selector: 'app-ad-card',
  templateUrl: './ad-card.component.html',
  styleUrls: ['./ad-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonCard, IonAvatar, IonIcon, IonButton, IonLabel, IonItem, IonBadge]
})
export class AdCardComponent {
  @Input() ad!: Advertisement;

  constructor() {
    addIcons({ megaphoneOutline, openOutline });
  }

  goToSite() {
    if (this.ad.siteLink) {
      window.open(this.ad.siteLink, '_blank');
    }
  }
}
