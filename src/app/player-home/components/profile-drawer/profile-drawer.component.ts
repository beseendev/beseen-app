import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';
import { AuthService, JwtPayload } from '../../../services/auth.service';
import { PlayerCardComponent } from '../../../components/player-card/player-card.component';

@Component({
  selector: 'app-profile-drawer',
  templateUrl: './profile-drawer.component.html',
  styleUrls: ['./profile-drawer.component.scss'],
  standalone: true,
  imports: [CommonModule, IonButton, PlayerCardComponent],
})
export class ProfileDrawerComponent {
  @Input() profile: any | null = null;
  private authService = inject(AuthService);

  @Output() myVideos = new EventEmitter<void>();
  @Output() invites = new EventEmitter<void>();
  @Output() editProfile = new EventEmitter<void>();
  @Output() blockedUsers = new EventEmitter<void>();
  @Output() signOut = new EventEmitter<void>();
  @Output() deleteAccount = new EventEmitter<void>();

  get displayName(): string {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    return decodedToken?.name || 'Clube';
  }

  get displayPosition(): string {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    return decodedToken?.position || this.profile?.position || 'Posição não definida';
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

  onDeleteAccount(): void {
    this.deleteAccount.emit();
  }
}
