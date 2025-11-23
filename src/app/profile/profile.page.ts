import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonContent, IonAvatar, IonTitle, IonLabel, IonGrid, IonRow, IonCol, IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonList, IonText, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSegment, IonSegmentButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, settingsOutline, personAddOutline, chatbubbleOutline, personCircleOutline, briefcaseOutline, calendarOutline, bodyOutline, resizeOutline, scaleOutline, informationCircleOutline, timeOutline, imageOutline, videocamOutline } from 'ionicons/icons';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileService } from '../services/profile.service';
import { PostService } from '../services/post.service';
import { Profile } from '../models/profile.model';
import { Post } from '../models/post.model';
import { FileType } from '../models/upload.model'; // Added FileType import
import { Observable, BehaviorSubject } from 'rxjs';
import { switchMap, tap, map, filter } from 'rxjs/operators';
import { PostCardComponent } from '../components/post-card/post-card.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, // Added FormsModule
    IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonContent, IonAvatar, IonTitle, IonLabel, IonGrid, IonRow, IonCol, IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent, IonItem,
    IonList, IonText, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonSegment, IonSegmentButton, // Added IonSegment and IonSegmentButton
    PostCardComponent
  ],
})
export class ProfilePage implements OnInit {
  profileId: string | null = null;
  profile: Profile | null = null;
  isMyProfile = false;
  selectedSegment: 'images' | 'videos' = 'images'; // Added selectedSegment
  private readonly DEFAULT_POST_LIMIT = 10; // Define a default limit

  private profileService = inject(ProfileService);
  private postService = inject(PostService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  private userPostsSubject = new BehaviorSubject<Post[]>([]);
  filteredUserPosts$: Observable<Post[]>;
  private userPostsCurrentCursor: string | undefined; // Renamed to clarify it's the current cursor
  private userPostsHasMore = true;

  constructor() {
    addIcons({ arrowBackOutline, settingsOutline, personAddOutline, chatbubbleOutline, personCircleOutline, briefcaseOutline, calendarOutline, bodyOutline, resizeOutline, scaleOutline, informationCircleOutline, timeOutline, imageOutline, videocamOutline });

    this.filteredUserPosts$ = this.userPostsSubject.asObservable().pipe(
      map(posts => posts.filter(post => {
        // Use FileType enum from post.model.ts for filtering
        if (this.selectedSegment === 'images') {
          return post.mediaType === FileType.IMAGE;
        } else if (this.selectedSegment === 'videos') {
          return post.mediaType === FileType.VIDEO;
        }
        return true;
      }))
    );
  }

  ngOnInit() {
    this.activatedRoute.paramMap.pipe(
      switchMap(params => {
        this.profileId = params.get('userId');

        // Determine if it's "my" profile
        // In a real app, you'd get the current user's ID from AuthService
        // and compare it with this.profileId
        return this.authService.getCurrentUser().pipe( // Changed from getCurrentUserId()
          filter(user => !!user), // Ensure user is not null
          map(user => user.id), // Extract user ID
          tap(currentUserId => {
            this.isMyProfile = !this.profileId || this.profileId === currentUserId;
          }),
          switchMap(() => this.profileService.getProfile(this.profileId ?? undefined)) // Fixed passing null
        );
      }),
      tap(profile => {
        this.profile = profile;
        // Optionally set profileId if it was "me" and we got the actual ID
        if (!this.profileId && profile) {
          this.profileId = profile.id;
        }
        this.resetAndLoadUserPosts();
      })
    ).subscribe();
  }

  segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
    // The filteredUserPosts$ observable already handles this reactivity.
    // No need to explicitly reload posts here, as the filter will re-apply.
  }

  goBack() {
    this.router.navigateByUrl('/home');
  }

  goToSettings() {
    console.log('Go to settings');
    // Implement navigation to settings page
  }

  followUser() {
    console.log('Follow user', this.profile?.name);
    // Implement follow logic
  }

  startChat() {
    console.log('Start chat with', this.profile?.name);
    // Implement chat initiation logic
  }

  async loadMoreUserPosts(event: any) {
    if (!this.userPostsHasMore || !this.profileId) {
      event.target.complete();
      return;
    }

    this.postService.getPostsForAuthenticatedUser(this.DEFAULT_POST_LIMIT, this.userPostsCurrentCursor).subscribe({
      next: response => {
        this.userPostsSubject.next([...this.userPostsSubject.getValue(), ...response.posts]);
        this.userPostsCurrentCursor = response.nextCursor || undefined;
        this.userPostsHasMore = !!response.nextCursor;
        event.target.complete();
      },
      error: err => {
        console.error('Error loading more user posts', err);
        event.target.complete();
      }
    });
  }

  async refreshUserPosts(event: any) {
    await this.resetAndLoadUserPosts();
    event.target.complete();
  }

  private async resetAndLoadUserPosts() {
    this.userPostsSubject.next([]); // Clear current posts
    this.userPostsCurrentCursor = undefined;
    this.userPostsHasMore = true;

    if (this.profileId) {
      // Fetch initial posts using the new service method
      this.postService.getPostsForAuthenticatedUser(this.DEFAULT_POST_LIMIT, this.userPostsCurrentCursor).subscribe({
        next: response => {
          this.userPostsSubject.next(response.posts);
          this.userPostsCurrentCursor = response.nextCursor || undefined;
          this.userPostsHasMore = !!response.nextCursor;
        },
        error: err => {
          console.error('Error refreshing user posts', err);
        }
      });
    }
  }

  trackById(index: number, post: Post): string {
    return post.id;
  }
}
