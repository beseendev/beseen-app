import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon, IonContent, IonAvatar, IonSpinner, IonInfiniteScroll, IonInfiniteScrollContent, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, banOutline, personCircleOutline } from 'ionicons/icons';
import { Router } from '@angular/router';
import { BlockService } from '../services/block.service';
import { BlockedUser } from '../models/block.model';
import { AuthService, JwtPayload } from '../services/auth.service';

@Component({
  selector: 'app-blocked-users',
  templateUrl: './blocked-users.page.html',
  styleUrls: ['./blocked-users.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    IonIcon,
    IonContent,
    IonAvatar,
    IonSpinner,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonRefresher,
    IonRefresherContent
  ],
})
export class BlockedUsersPage implements OnInit {
  blockedUsers: BlockedUser[] = [];
  isLoading = false;
  hasMore = true;
  unblockingIds = new Set<string>();

  private readonly PAGE_SIZE = 10;
  private currentPage = 0;

  private blockService = inject(BlockService);
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    addIcons({ arrowBackOutline, banOutline, personCircleOutline });
  }

  ngOnInit() {
    this.loadBlockedUsers();
  }

  loadBlockedUsers(event?: any) {
    if (this.isLoading || (!this.hasMore && event)) {
      if (event) event.target.complete();
      return;
    }

    this.isLoading = true;
    this.blockService.getBlockedUsers(this.currentPage, this.PAGE_SIZE).subscribe({
      next: (response) => {
        const items = response?.items ?? [];
        this.blockedUsers = [...this.blockedUsers, ...items];
        // Sem itens novos ou lista completa: encerra a paginação para o
        // infinite scroll não disparar de novo no fim da página.
        this.hasMore = items.length > 0 && this.blockedUsers.length < (response?.totalElements ?? 0);
        this.currentPage++;
        this.isLoading = false;

        if (event) event.target.complete();
      },
      error: (err) => {
        console.error('Error loading blocked users', err);
        // Interrompe a paginação em caso de erro para não repetir a
        // requisição a cada evento de scroll; o refresher reabilita.
        this.hasMore = false;
        this.isLoading = false;
        if (event) event.target.complete();
      }
    });
  }

  refresh(event?: any) {
    this.blockedUsers = [];
    this.currentPage = 0;
    this.hasMore = true;
    this.loadBlockedUsers();
    if (event) event.target.complete();
  }

  unblock(user: BlockedUser) {
    if (this.unblockingIds.has(user.profileId)) {
      return;
    }

    this.unblockingIds.add(user.profileId);
    this.blockService.unblockUser(user.profileId).subscribe({
      next: () => {
        this.unblockingIds.delete(user.profileId);
        this.blockedUsers = this.blockedUsers.filter(u => u.profileId !== user.profileId);
      },
      error: (err) => {
        console.error('Error unblocking user', err);
        this.unblockingIds.delete(user.profileId);
      }
    });
  }

  isUnblocking(user: BlockedUser): boolean {
    return this.unblockingIds.has(user.profileId);
  }

  getRoleLabel(role: BlockedUser['role']): string {
    return role === 'CLUBE' ? 'Olheiro' : 'Jogador';
  }

  goBack() {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    const isClube = decodedToken?.role === 'CLUBE';

    isClube ? this.router.navigateByUrl('/scout-home') : this.router.navigateByUrl('/player-home');
  }
}
