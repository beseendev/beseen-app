import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonContent, IonAvatar, IonTitle, IonLabel, IonNote, IonGrid, IonRow, IonCol, IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent, IonItem } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, settingsOutline, personAddOutline, chatbubbleOutline, personCircleOutline } from 'ionicons/icons';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileService } from '../services/profile.service';
import { PostService } from '../services/post.service';
import { Profile } from '../models/profile.model';
import { Post } from '../models/post.model';
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
    IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonContent, IonAvatar, IonTitle, IonLabel, IonNote, IonGrid, IonRow, IonCol, IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent, IonItem,
    PostCardComponent
  ],
})
export class ProfilePage implements OnInit {
  profileId: string | null = null;
  profile: Profile | null = null;
  isMyProfile = false;
  
  private profileService = inject(ProfileService);
  private postService = inject(PostService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  private userPostsSubject = new BehaviorSubject<Post[]>([]);
  userPosts$: Observable<Post[]> = this.userPostsSubject.asObservable();
  private userPostsNextCursor: string | undefined;
  private userPostsHasMore = true;

  constructor() {
    addIcons({ arrowBackOutline, settingsOutline, personAddOutline, chatbubbleOutline, personCircleOutline });
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

  loadMoreUserPosts(event: any) {
    if (!this.userPostsHasMore || !this.profileId) {
      event.target.complete();
      return;
    }
    this.postService.getPostsByUserId(this.profileId, this.userPostsNextCursor).subscribe(
      response => {
        this.userPostsSubject.next([...this.userPostsSubject.getValue(), ...response.posts]);
        this.userPostsNextCursor = response.nextCursor || undefined;
        this.userPostsHasMore = !!response.nextCursor;
        event.target.complete();
      },
      error => {
        console.error('Error loading more user posts', error);
        event.target.complete();
      }
    );
  }

  refreshUserPosts(event: any) {
    this.resetAndLoadUserPosts(() => event.target.complete());
  }

  private resetAndLoadUserPosts(onComplete?: () => void) {
    this.userPostsSubject.next([]);
    this.userPostsNextCursor = undefined;
    this.userPostsHasMore = true;
    if (this.profileId) {
      this.postService.getPostsByUserId(this.profileId).subscribe(
        response => {
          this.userPostsSubject.next(response.posts);
          this.userPostsNextCursor = response.nextCursor || undefined;
          this.userPostsHasMore = !!response.nextCursor;
          if (onComplete) {
            onComplete();
          }
        },
        error => {
          console.error('Error refreshing user posts', error);
          if (onComplete) {
            onComplete();
          }
        }
      );
    } else {
        if (onComplete) {
            onComplete();
        }
    }
  }
  
  trackById(index: number, post: Post): string {
    return post.id;
  }
}
