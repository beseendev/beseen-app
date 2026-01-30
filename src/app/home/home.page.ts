import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild } from '@angular/core';
import { IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonContent, IonAvatar, IonFooter, IonSpinner, IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent, IonMenu, IonTitle, IonSearchbar, IonList, IonItem, IonLabel, MenuController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { footballOutline, chatbubbleEllipsesOutline, homeOutline, cameraOutline, searchOutline, personCircleOutline, logOutOutline, closeOutline } from 'ionicons/icons';
import {AuthService, JwtPayload} from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { Router } from '@angular/router';
import { PostService } from '../services/post.service';
import { Post } from '../models/post.model';
import { Observable } from 'rxjs';
import { PostCardComponent } from '../components/post-card/post-card.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonAvatar,
    IonFooter,
    IonSpinner,
    PostCardComponent,
    IonRefresher,
    IonRefresherContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonMenu,
    IonTitle,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
  ],
})
export class HomePage {
  @ViewChild(IonContent) content!: IonContent;
  userProfile: any | null = null;
  isLoading = true;
  posts$: Observable<Post[]>;
  userRole: string | null = null;

  contacts = [
    {
      name: 'João Silva',
      photo: 'https://via.placeholder.com/150',
    },
    {
      name: 'Maria Santos',
      photo: 'https://via.placeholder.com/150',
    },
    {
      name: 'Pedro Costa',
      photo: 'https://via.placeholder.com/150',
    },
  ];

  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private router = inject(Router);
  private postService = inject(PostService);
  private menuController = inject(MenuController);

  constructor() {
    this.posts$ = this.postService.homePosts$;
    this.extractRoleFromToken();
    addIcons({
      footballOutline,
      chatbubbleEllipsesOutline,
      homeOutline,
      cameraOutline,
      searchOutline,
      personCircleOutline,
      logOutOutline,
      closeOutline
    });
  }

  private extractRoleFromToken() {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    if (decodedToken && decodedToken.role) {
      this.userRole = decodedToken.role;
    }
  }

  ionViewWillEnter(): void {
    // Load user profile
    this.apiService.get<any>('/profile/me').subscribe({
      next: (profile) => {
        if (profile && profile.urlPefil) {
          profile.urlPerfil = profile.urlPefil;
          delete profile.urlPefil;
        }
        this.userProfile = profile;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load user profile', err);
        this.isLoading = false;
      },
    });

    if (this.postService.shouldLoadInitialHomePosts()) {
      this.postService.loadHomePosts().subscribe();
    }
  }

  loadMorePosts(event: any) {
    this.postService.loadHomePosts().subscribe(() => {
      event.target.complete();
    });
  }

  refreshPosts(event: any) {
    this.postService.refreshHomePosts().subscribe(() => {
      event.target.complete();
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onHeartClick() {
    console.log('Heart icon clicked');
  }

  onMessagesClick() {
    this.menuController.open('messagesMenu');
  }

  onHomeClick() {
    this.content.scrollToTop(500);
  }

  goToCreatePost() {
    this.router.navigateByUrl('/create-post');
  }

  onSearchClick() {
    console.log('Search icon clicked');
  }

  onHeaderAvatarClick() {
    if (!this.userRole) return;

    if (this.userRole === 'JOGADOR') {
      this.router.navigateByUrl('/profile');
    } else if (this.userRole === 'CLUBE') {
      console.log('CLUBE user clicked avatar, but cannot access profile.');
    }
  }

  closeMessagesMenu() {
    this.menuController.close('messagesMenu');
  }

  selectContact(contact: any) {
    console.log('Selected contact:', contact);
    // Aqui você pode adicionar a lógica para abrir a conversa com o contato
    this.menuController.close('messagesMenu');
  }

  trackById(index: number, post: Post): string {
    return post.id;
  }
}
