import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, of, Observable, EMPTY } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Post } from '../models/post.model';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private apiService = inject(ApiService);

  private posts = new BehaviorSubject<Post[]>([]);
  posts$ = this.posts.asObservable();

  private nextCursor: string | null = null;
  private hasMorePosts = true;

  loadPosts(): Observable<{ posts: Post[]; nextCursor: string | null; }> {
    if (!this.hasMorePosts) {
      return EMPTY;
    }

    const endpoint = this.nextCursor ? `/posts?cursor=${this.nextCursor}` : '/posts';

    // This is a mocked response. Replace with actual API call.
    // For now, let's simulate a response to build the UI.
    const mockResponse = this.getMockPosts();
    return of(mockResponse).pipe(
      tap(response => {
        if (response && response.posts) {
          const currentPosts = this.posts.getValue();
          this.posts.next([...currentPosts, ...response.posts]);
          this.nextCursor = response.nextCursor;
          this.hasMorePosts = !!response.nextCursor;
        }
      })
    );
  }

  refreshPosts(): Observable<{ posts: Post[]; nextCursor: string | null; }> {
    this.posts.next([]);
    this.nextCursor = null;
    this.hasMorePosts = true;
    return this.loadPosts();
  }

  shouldLoadInitialPosts(): boolean {
    return this.posts.getValue().length === 0;
  }

  getPostsByUserId(userId: string, cursor?: string): Observable<{ posts: Post[]; nextCursor: string | null }> {
    // This is a mocked response. Replace with actual API call:
    // const endpoint = cursor ? `/posts/user/${userId}?cursor=${cursor}` : `/posts/user/${userId}`;
    // return this.apiService.get<{ posts: Post[], nextCursor: string | null }>(endpoint);

    // Mock implementation for demonstration
    const mockPosts = this.getMockPostsForUser(userId, cursor);
    return of(mockPosts);
  }

  private getMockPosts(): { posts: Post[], nextCursor: string | null } {
    // Create a few mock posts for UI development
    const currentCount = this.posts.getValue().length;
    if (currentCount > 20) { // Stop mocking after 20 posts
      return { posts: [], nextCursor: null };
    }

    const posts: Post[] = [];
    for (let i = 1; i <= 10; i++) {
      const id = currentCount + i;
      const mediaType = id % 3 === 0 ? 'video' : 'image';
      const mediaUrl = mediaType === 'image'
        ? `https://picsum.photos/600/800?random=${id}`
        : `https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4`; // Sample video

      posts.push({
        id: `post${id}`,
        user: {
          name: `User ${id}`,
          avatarUrl: `https://i.pravatar.cc/150?u=user${id}`
        },
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        caption: `This is post number ${id}. What a great piece of media!`,
        likes: Math.floor(Math.random() * 1000),
        comments: Math.floor(Math.random() * 100),
        isLiked: Math.random() > 0.5,
      });
    }

    return { posts, nextCursor: `cursor${currentCount + 10}` };
  }

  private getMockPostsForUser(userId: string, cursor?: string): { posts: Post[], nextCursor: string | null } {
    const userPosts: Post[] = [];
    const startId = cursor ? parseInt(cursor.replace('cursor', '')) : 1;
    const count = 10; // Number of posts per page

    for (let i = 0; i < count; i++) {
      const id = startId + i;
      const mediaType = id % 3 === 0 ? 'video' : 'image';
      const mediaUrl = mediaType === 'image'
        ? `https://picsum.photos/600/800?random=${userId}-${id}`
        : `https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4`; // Sample video

      userPosts.push({
        id: `user${userId}-post${id}`,
        user: {
          name: `User ${userId}`,
          avatarUrl: `https://i.pravatar.cc/150?u=user${userId}`
        },
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        caption: `This is post number ${id} from user ${userId}.`,
        likes: Math.floor(Math.random() * 500),
        comments: Math.floor(Math.random() * 50),
        isLiked: Math.random() > 0.5,
      });
    }

    const nextCursor = (startId + count <= 30) ? `cursor${startId + count}` : null; // Limit total mock posts for a user
    return { posts: userPosts, nextCursor: nextCursor };
  }
}

