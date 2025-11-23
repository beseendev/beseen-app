import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild } from '@angular/core';
import { IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonContent, IonAvatar, IonFooter, IonSpinner, IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { footballOutline, chatbubbleEllipsesOutline, homeOutline, cameraOutline, searchOutline, personCircleOutline, logOutOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
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
  ],
})
export class HomePage {
  @ViewChild(IonContent) content!: IonContent;
  userProfile: any | null = null;
  isLoading = true;
  posts$: Observable<Post[]>;

  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private router = inject(Router);
  private postService = inject(PostService);

  constructor() {
    this.posts$ = this.postService.posts$;
    addIcons({
      footballOutline,
      chatbubbleEllipsesOutline,
      homeOutline,
      cameraOutline,
      searchOutline,
      personCircleOutline,
      logOutOutline,
    });
  }

  ionViewWillEnter(): void {
    // Load user profile
    this.apiService.get<any>('/profile/me').subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load user profile', err);
        this.isLoading = false;
      },
    });

    // Load initial posts only if the posts array is empty
    if (this.postService.shouldLoadInitialPosts()) {
      this.postService.loadPosts().subscribe();
    }
  }

  loadMorePosts(event: any) {
    this.postService.loadPosts().subscribe(() => {
      event.target.complete();
    });
  }

  refreshPosts(event: any) {
    this.postService.refreshPosts().subscribe(() => {
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
    console.log('Messages icon clicked');
  }

  onHomeClick() {
    this.content.scrollToTop(500);
  }

  onPostClick() {
    console.log('Post (camera) icon clicked');
  }

  onSearchClick() {
    console.log('Search icon clicked');
  }

  goToProfile() {
    console.log('Navigating to profile...');
    this.router.navigateByUrl('/profile');
  }

  trackById(index: number, post: Post): string {
    return post.id;
  }
}
