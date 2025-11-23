import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, of, Observable, EMPTY } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { Post, UserInfo } from '../models/post.model';
import { ApiService } from './api.service';
import { HttpParams } from '@angular/common/http';
import { FileType } from '../models/upload.model';

// Backend DTOs (as per your provided structure)
interface PostPageResponseDto { // Renamed to avoid conflict with method return
  posts: PostResponseDto[];
  nextCursor: string | null;
}

interface PostResponseDto { // Renamed to avoid conflict with method return
  id: number; // Backend Long maps to TypeScript number
  user: { // Assuming this is UserResponse from your backend
    id: number; // Assuming UserResponse has an ID
    username: string;
    urlPerfil?: string;
  };
  mediaUrl: string;
  mediaType: FileType;
  caption: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string; // LocalDateTime maps to string
}

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private apiService = inject(ApiService);

  private userPostsSubject = new BehaviorSubject<Post[]>([]);
  // userPosts$ is now observed by filteredUserPosts$ in profile.page.ts
  private userPostsNextCursor: string | null = null;
  private userPostsHasMore = true;

  constructor() { }

  /**
   * Maps a backend PostResponse DTO to the frontend Post model.
   * @param postResponse The backend PostResponse object.
   * @returns The frontend Post model.
   */
  private mapPostResponseToPost(postResponse: PostResponseDto): Post {
    const user: UserInfo = {
      id: String(postResponse.user.id), // Ensure user ID is string
      username: postResponse.user.username,
      urlPerfil: postResponse.user.urlPerfil
    };

    return {
      id: String(postResponse.id), // Convert backend Long to string
      user: user,
      mediaUrl: postResponse.mediaUrl,
      mediaType: postResponse.mediaType,
      caption: postResponse.caption,
      likesCount: postResponse.likesCount,
      commentsCount: postResponse.commentsCount,
      isLiked: postResponse.isLiked,
      createdAt: postResponse.createdAt
    };
  }

  /**
   * Fetches posts for the authenticated user from the backend.
   * This is intended for the profile page.
   * @param limit The maximum number of posts to retrieve.
   * @param cursor An optional cursor for pagination.
   * @returns An Observable of PostPageResponse from the backend.
   */
  getPostsForAuthenticatedUser(limit: number, cursor?: string): Observable<{ posts: Post[], nextCursor: string | null }> {
    let params = new HttpParams().set('limit', limit.toString());
    if (cursor) {
      params = params.set('nextCursor', cursor); // Assuming backend uses 'nextCursor' for its pagination
    }

    return this.apiService.get<PostPageResponseDto>(`/posts/my-posts`, { params }).pipe(
      map(response => {
        const mappedPosts = response.posts.map(postDto => this.mapPostResponseToPost(postDto));
        return { posts: mappedPosts, nextCursor: response.nextCursor };
      }),
      tap(response => {
        // Here you could potentially log or debug the raw response if needed
        // console.log('Mapped API response for user posts:', response);
      })
    );
  }

  // --- Methods for the Home Page (keeping mock for now as per previous instruction) ---

  // Original posts subject for home page (if any)
  private homePosts = new BehaviorSubject<Post[]>([]);
  homePosts$ = this.homePosts.asObservable(); // Renamed to avoid confusion with userPostsSubject

  private homeNextCursor: string | null = null;
  private homeHasMorePosts = true;

  loadHomePosts(limit: number = 10): Observable<any> { // Corrected method name
    if (!this.homeHasMorePosts) {
      return EMPTY;
    }

    const endpoint = this.homeNextCursor ? `/posts?cursor=${this.homeNextCursor}&limit=${limit}` : `/posts?limit=${limit}`;

    // This is a mocked response for the home page. Replace with actual API call later.
    const mockResponse = this.getMockPostsHome();
    return of(mockResponse).pipe(
      tap(response => {
        if (response && response.posts) {
          const currentPosts = this.homePosts.getValue();
          this.homePosts.next([...currentPosts, ...response.posts]);
          this.homeNextCursor = response.nextCursor;
          this.homeHasMorePosts = !!response.nextCursor;
        }
      })
    );
  }

  refreshHomePosts(limit: number = 10): Observable<any> { // Corrected method name
    this.homePosts.next([]);
    this.homeNextCursor = null;
    this.homeHasMorePosts = true;
    return this.loadHomePosts(limit); // Call loadHomePosts here
  }

  shouldLoadInitialHomePosts(): boolean {
    return this.homePosts.getValue().length === 0;
  }

  private getMockPostsHome(): { posts: Post[], nextCursor: string | null } {
    // Create a few mock posts for UI development
    const currentCount = this.homePosts.getValue().length;
    if (currentCount > 20) { // Stop mocking after 20 posts
      return { posts: [], nextCursor: null };
    }

    const posts: Post[] = [];
    for (let i = 1; i <= 10; i++) {
      const id = currentCount + i;
      const mediaType = id % 3 === 0 ? FileType.VIDEO : FileType.IMAGE; // Use FileType enum
      const mediaUrl = mediaType === FileType.IMAGE
        ? `https://picsum.photos/600/800?random=${id}`
        : `https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4`; // Sample video

      posts.push({
        id: `post${id}`,
        user: {
          id: String(id),
          username: `User ${id}`,
          urlPerfil: `https://i.pravatar.cc/150?u=user${id}`
        },
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        caption: `This is post number ${id}. What a great piece of media!`,
        likesCount: Math.floor(Math.random() * 1000),
        commentsCount: Math.floor(Math.random() * 100),
        isLiked: Math.random() > 0.5,
        createdAt: new Date().toISOString()
      });
    }

    return { posts, nextCursor: `cursor${currentCount + 10}` };
  }
}