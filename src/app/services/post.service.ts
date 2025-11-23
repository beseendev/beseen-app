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

  private getMockPosts(): { posts: Post[], nextCursor: string | null } {
    // Create a few mock posts for UI development
    const currentCount = this.posts.getValue().length;
    if (currentCount > 20) { // Stop mocking after 20 posts
      return { posts: [], nextCursor: null };
    }

    const posts: Post[] = [];
    for (let i = 1; i <= 10; i++) {
      const id = currentCount + i;
      posts.push({
        id: `post${id}`,
        user: {
          name: `User ${id}`,
          avatarUrl: `https://i.pravatar.cc/150?u=user${id}`
        },
        mediaUrl: `https://picsum.photos/600/800?random=${id}`,
        mediaType: 'image',
        caption: `This is post number ${id}. What a great picture!`,
        likes: Math.floor(Math.random() * 1000),
        comments: Math.floor(Math.random() * 100),
        isLiked: Math.random() > 0.5,
      });
    }

    return { posts, nextCursor: `cursor${currentCount + 10}` };
  }
}
