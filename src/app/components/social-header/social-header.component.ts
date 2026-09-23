import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notificationsOutline, chatbubbleEllipsesOutline } from 'ionicons/icons';
import { HomeScrollService } from '../../services/home-scroll.service';
@Component({
  selector: 'app-social-header', standalone: true, imports: [CommonModule, IonIcon],
  templateUrl: './social-header.component.html', styleUrls: ['./social-header.component.scss']
})
export class SocialHeaderComponent {
  @Input() notificationsCount = 0;
  @Input() messagesCount = 0;
  @Output() notifications = new EventEmitter<void>();
  @Output() messages = new EventEmitter<void>();
  private homeScroll = inject(HomeScrollService);
  constructor() { addIcons({ notificationsOutline, chatbubbleEllipsesOutline }); }

  /** Toca no logo "BeSeen": mesmo atalho do ícone "Início" da barra inferior, volta ao topo do feed. */
  onLogoClick(): void {
    this.homeScroll.requestScrollToTop();
  }
}
