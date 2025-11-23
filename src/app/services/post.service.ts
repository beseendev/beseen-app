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

    let params = new HttpParams().set('limit', limit.toString());
    if (this.homeNextCursor) {
      params = params.set('cursor', this.homeNextCursor);
    }

    return this.apiService.get<PostPageResponseDto>(`/posts`, { params }).pipe(
      map(response => {
        const mappedPosts = response.posts.map(postDto => this.mapPostResponseToPost(postDto));
        return { posts: mappedPosts, nextCursor: response.nextCursor };
      }),
      tap(response => {
        const currentPosts = this.homePosts.getValue();
        this.homePosts.next([...currentPosts, ...response.posts]); // response.posts are already mapped
        this.homeNextCursor = response.nextCursor;
        this.homeHasMorePosts = !!response.nextCursor;
      }),
      map(response => ({ posts: response.posts, nextCursor: response.nextCursor })) // Return mapped posts
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
  }}
