import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, of, Observable, EMPTY } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { Post, UserInfo } from '../models/post.model';
import { ApiService } from './api.service';
import { HttpParams } from '@angular/common/http';
import { FileType } from '../models/upload.model';

interface PostPageResponseDto {
  posts: PostResponseDto[];
  nextCursor: string | null;
}

interface PostResponseDto {
  id: number;
  user: {
    id: number;
    username: string;
    urlPerfil?: string;
  };
  mediaUrl: string;
  mediaType: FileType;
  caption: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private apiService = inject(ApiService);

  private userPostsSubject = new BehaviorSubject<Post[]>([]);
  private userPostsNextCursor: string | null = null;
  private userPostsHasMore = true;

  constructor() { }

  private mapPostResponseToPost(postResponse: PostResponseDto): Post {
    const user: UserInfo = {
      id: String(postResponse.user.id),
      username: postResponse.user.username,
      urlPerfil: postResponse.user.urlPerfil
    };

    return {
      id: String(postResponse.id),
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

  getPostsForAuthenticatedUser(limit: number, cursor?: string): Observable<{ posts: Post[], nextCursor: string | null }> {
    let params = new HttpParams().set('limit', limit.toString());
    if (cursor) {
      params = params.set('nextCursor', cursor);
    }

    return this.apiService.get<PostPageResponseDto>(`/posts/my-posts`, { params }).pipe(
      map(response => {
        const mappedPosts = response.posts.map(postDto => this.mapPostResponseToPost(postDto));
        return { posts: mappedPosts, nextCursor: response.nextCursor };
      }),
      tap(response => {
      })
    );
  }

  private homePosts = new BehaviorSubject<Post[]>([]);
  homePosts$ = this.homePosts.asObservable();

  private homeNextCursor: string | null = null;
  private homeHasMorePosts = true;

  loadHomePosts(limit: number = 10): Observable<any> {
    if (!this.homeHasMorePosts) {
      return EMPTY;
    }

    const endpoint = this.homeNextCursor ? `/posts?cursor=${this.homeNextCursor}&limit=${limit}` : `/posts?limit=${limit}`;
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

  refreshHomePosts(limit: number = 10): Observable<any> {
    this.homePosts.next([]);
    this.homeNextCursor = null;
    this.homeHasMorePosts = true;
    return this.loadHomePosts(limit);
  }

  shouldLoadInitialHomePosts(): boolean {
    return this.homePosts.getValue().length === 0;
  }

  private getMockPostsHome(): { posts: Post[], nextCursor: string | null } {
    const currentCount = this.homePosts.getValue().length;
    if (currentCount > 20) {
      return { posts: [], nextCursor: null };
    }

    const posts: Post[] = [];
    for (let i = 1; i <= 10; i++) {
      const id = currentCount + i;
      const mediaType = id % 3 === 0 ? FileType.VIDEO : FileType.IMAGE;
      const mediaUrl = mediaType === FileType.IMAGE
        ? `https://picsum.photos/600/800?random=${id}`
        : `https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4`;

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
