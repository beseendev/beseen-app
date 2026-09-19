import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, OnDestroy, Output, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { IonIcon, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { home, homeOutline, add, mailOutline, search, searchOutline, star, starOutline, person, personOutline } from 'ionicons/icons';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { InvitesSheetComponent } from '../../player-home/components/invites-sheet/invites-sheet.component';

@Component({
  selector: 'app-bottom-navigation', standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './bottom-navigation.component.html',
  styleUrls: ['./bottom-navigation.component.scss']
})
export class BottomNavigationComponent implements OnDestroy {
  @Output() visibilityChange = new EventEmitter<boolean>();
  private router = inject(Router);
  private auth = inject(AuthService);
  private modalController = inject(ModalController);
  readonly chat = inject(ChatService);
  private subscriptions = new Subscription();
  role: string | null = null;
  visible = false;
  active = '';
  private inputFocused = false;
  private openingInvites = false;

  constructor() {
    addIcons({ home, homeOutline, add, mailOutline, search, searchOutline, star, starOutline, person, personOutline });
    this.subscriptions.add(this.auth.userRole$.subscribe(role => { this.role = role; this.update(); }));
    this.subscriptions.add(this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => this.update()));
  }

  @HostListener('document:focusin', ['$event'])
  onFocus(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    this.inputFocused = !!target?.matches('input, textarea, select, ion-input, ion-textarea, ion-searchbar, [contenteditable="true"]');
    this.update();
  }

  @HostListener('document:focusout')
  onBlur(): void { this.inputFocused = false; this.update(); }

  private update(): void {
    const tree = this.router.parseUrl(this.router.url);
    const path = '/' + (tree.root.children['primary']?.segments.map(segment => segment.path).join('/') || '');
    const allowed = /^\/(player-home|scout-home|scout-athlete-search|profile-player(?:\/[^/]+)?|profile-scout(?:\/[^/]+)?)$/.test(path);
    const nextVisible = allowed && (this.role === 'CLUBE' || this.role === 'JOGADOR') && !this.inputFocused;
    this.active = path === '/scout-home' ? (tree.queryParams['tab'] === 'favoritos' ? 'favorites' : 'home')
      : path === '/player-home' ? 'home'
      : path === '/scout-athlete-search' ? 'search'
      : path === (this.role === 'CLUBE' ? '/profile-scout' : '/profile-player') ? 'profile' : '';
    this.visible = nextVisible;
    // Schedule the layout output after the current route render.
    queueMicrotask(() => this.visibilityChange.emit(this.visible));
  }

  navigate(destination: string): void {
    if (destination === 'favorites') {
      void this.router.navigate(['/scout-home'], { queryParams: { tab: 'favoritos' } });
    } else {
      const routes: Record<string, string> = {
        home: this.role === 'CLUBE' ? '/scout-home' : '/player-home',
        profile: this.role === 'CLUBE' ? '/profile-scout' : '/profile-player',
        search: '/scout-athlete-search', publish: '/create-post'
      };
      void this.router.navigateByUrl(routes[destination]);
    }
  }

  async openInvites(): Promise<void> {
    if (this.openingInvites) return;
    this.openingInvites = true;
    try {
      const modal = await this.modalController.create({
        component: InvitesSheetComponent, componentProps: { postId: undefined },
        breakpoints: [0, 0.5, 0.8, 0.95], initialBreakpoint: 0.8,
        backdropBreakpoint: 0.5, canDismiss: true, handle: true, cssClass: 'invites-modal-sheet'
      });
      await modal.present();
      await modal.onDidDismiss();
    } finally { this.openingInvites = false; }
  }

  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }
}
