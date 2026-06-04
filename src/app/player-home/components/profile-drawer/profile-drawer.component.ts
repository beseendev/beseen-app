import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { IonAvatar, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-profile-drawer',
  templateUrl: './profile-drawer.component.html',
  styleUrls: ['./profile-drawer.component.scss'],
  standalone: true,
  imports: [CommonModule, IonAvatar, IonButton, IonIcon],
})
export class ProfileDrawerComponent implements OnChanges {
  @Input() profile: any | null = null;
  avatarLoadFailed = false;

  @Output() myVideos = new EventEmitter<void>();
  @Output() invites = new EventEmitter<void>();
  @Output() editProfile = new EventEmitter<void>();
  @Output() signOut = new EventEmitter<void>();

  constructor() {
    addIcons({ personCircleOutline });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['profile']) {
      this.avatarLoadFailed = false;
    }
  }

  get displayName(): string {
    return this.profile?.fullName || this.profile?.name || 'Atleta';
  }

  get displayPosition(): string {
    return this.profile?.position || 'Posição não definida';
  }

  get displayAbout(): string {
    return this.profile?.bio || 'Sem informações adicionais no momento.';
  }

  get avatarUrl(): string | null {
    if (this.avatarLoadFailed) {
      return null;
    }

    return this.profile?.urlPerfil || null;
  }

  onMyVideos(): void {
    this.myVideos.emit();
  }

  onInvites(): void {
    this.invites.emit();
  }

  onEditProfile(): void {
    this.editProfile.emit();
  }

  onSignOut(): void {
    this.signOut.emit();
  }

  onAvatarError(): void {
    this.avatarLoadFailed = true;
  }
}
