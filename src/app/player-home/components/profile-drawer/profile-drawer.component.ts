import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { IonAvatar, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personCircleOutline } from 'ionicons/icons';
import { AuthService, JwtPayload } from '../../../services/auth.service';

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
  private authService = inject(AuthService);

  @Output() myVideos = new EventEmitter<void>();
  @Output() invites = new EventEmitter<void>();
  @Output() editProfile = new EventEmitter<void>();
  @Output() blockedUsers = new EventEmitter<void>();
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
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    return decodedToken?.position || this.profile?.position || 'Posição não definida';
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

  onBlockedUsers(): void {
    this.blockedUsers.emit();
  }

  onSignOut(): void {
    this.signOut.emit();
  }

  onAvatarError(): void {
    this.avatarLoadFailed = true;
  }
}
