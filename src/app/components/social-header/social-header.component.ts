import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notificationsOutline, chatbubbleEllipsesOutline } from 'ionicons/icons';
@Component({
  selector: 'app-social-header', standalone: true, imports: [CommonModule, IonIcon],
  templateUrl: './social-header.component.html', styleUrls: ['./social-header.component.scss']
})
export class SocialHeaderComponent {
  @Input() notificationsCount = 0;
  @Input() messagesCount = 0;
  @Output() notifications = new EventEmitter<void>();
  @Output() messages = new EventEmitter<void>();
  constructor() { addIcons({ notificationsOutline, chatbubbleEllipsesOutline }); }
}
