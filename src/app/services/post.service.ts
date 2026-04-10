import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, of, Observable, EMPTY } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { Post, UserInfo } from '../models/post.model';
import { ApiService } from './api.service';
import { HttpParams } from '@angular/common/http';
import { FileType } from '../models/upload.model';
import { PostInvitePageResponse, PostInviteResponse } from '../models/player-chat.models';

interface PostPageResponseDto {
  items: PostResponseDto[];
  nextCursor: string | null;
}

interface PostResponseDto {
  id: number;
  user: {
    id?: number;
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
  inviteStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | null;
  scoutId?: number | null;
  athleteId?: number | null;
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
      id: String(postResponse.user.id || postResponse.athleteId || ''),
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
      createdAt: postResponse.createdAt,
      inviteStatus: postResponse.inviteStatus,
      scoutId: postResponse.scoutId,
      athleteId: postResponse.athleteId
    };
  }

  getPostsForAuthenticatedUser(limit: number, cursor?: string): Observable<{ posts: Post[], nextCursor: string | null }> {
    let params = new HttpParams().set('limit', limit.toString());
    if (cursor) {
      params = params.set('nextCursor', cursor);
    }

    return this.apiService.get<PostPageResponseDto>(`/posts/my-posts`, { params }).pipe(
      map(response => {
        const mappedPosts = response.items.map(postDto => this.mapPostResponseToPost(postDto));
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

  loadHomePosts(limit: number = 1): Observable<any> {
    if (!this.homeHasMorePosts) {
      return EMPTY;
    }

    let params = new HttpParams().set('limit', limit.toString());
    if (this.homeNextCursor) {
      params = params.set('cursor', this.homeNextCursor);
    }

    return this.apiService.get<PostPageResponseDto>(`/posts`, { params }).pipe(
      map(response => {
        const mappedPosts = response.items.map(postDto => this.mapPostResponseToPost(postDto));
        return { posts: mappedPosts, nextCursor: response.nextCursor };
      }),
      tap(response => {
        const currentPosts = this.homePosts.getValue();
        this.homePosts.next([...currentPosts, ...response.posts]); // response.posts are already mapped
        this.homeNextCursor = response.nextCursor;
        this.homeHasMorePosts = !!response.nextCursor;
      }),
      map(response => ({ posts: response.posts, nextCursor: response.nextCursor }))
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

  likePost(postId: string): Observable<void> {
    return this.apiService.post<void>(`/posts/${postId}/like`, {}).pipe(
      tap(() => {
        const postToUpdate = this.findPostInSubjects(postId);
        if (postToUpdate) {
          this.updatePostInSubjects(postId, true, postToUpdate.likesCount + 1);
        }
      })
    );
  }

  unlikePost(postId: string): Observable<void> {
    return this.apiService.delete<void>(`/posts/${postId}/like`).pipe(
      tap(() => {
        const postToUpdate = this.findPostInSubjects(postId);
        if (postToUpdate && postToUpdate.likesCount > 0) {
          this.updatePostInSubjects(postId, false, postToUpdate.likesCount - 1);
        }
      })
    );
  }

  sendInvite(postId: string): Observable<void> {
    return this.apiService.post<void>(`/posts/${postId}/invite`, {}).pipe(
      tap(() => {
        // Find and update the post in the homePosts observable
        const currentPosts = this.homePosts.getValue();
        const updatedPosts = currentPosts.map(post =>
          post.id === postId ? { ...post, inviteStatus: 'PENDING' as any } : post
        );
        this.homePosts.next(updatedPosts);
      })
    );
  }

  acceptInvite(inviteId: number): Observable<PostInviteResponse> {
    return this.apiService.patch<PostInviteResponse>(`/posts/invites/${inviteId}/accept`, {});
  }

  rejectInvite(inviteId: number): Observable<void> {
    return this.apiService.patch<void>(`/posts/invites/${inviteId}/reject`, {});
  }

  getInvites(limit: number = 10, cursor?: string, postId?: string): Observable<PostInvitePageResponse> {
    let params = new HttpParams().set('limit', limit.toString());
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    if (postId) {
      params = params.set('postId', postId);
    }
    return this.apiService.get<PostInvitePageResponse>(`/posts/invites`, { params });
  }

  getFavoritePosts(limit: number = 10, cursor?: string): Observable<{ posts: Post[], nextCursor: string | null }> {
    let params = new HttpParams().set('limit', limit.toString());
    if (cursor) {
      params = params.set('cursor', cursor);
    }

    return this.apiService.get<PostPageResponseDto>(`/posts/favorites`, { params }).pipe(
      map(response => {
        const mappedPosts = response.items.map(postDto => this.mapPostResponseToPost(postDto));
        return { posts: mappedPosts, nextCursor: response.nextCursor };
      })
    );
  }

  getRankingPosts(limit: number = 10, cursor?: string): Observable<{ posts: Post[], nextCursor: string | null }> {
    let params = new HttpParams().set('limit', limit.toString());
    if (cursor) {
      params = params.set('cursor', cursor);
    }

    return this.apiService.get<PostPageResponseDto>(`/posts/most-liked`, { params }).pipe(
      map(response => {
        const mappedPosts = response.items.map(postDto => this.mapPostResponseToPost(postDto));
        return { posts: mappedPosts, nextCursor: response.nextCursor };
      })
    );
  }

  /**
   * Updates a post's like status and count in both home and user post BehaviorSubjects.
   * @param postId The ID of the post to update.
   * @param newLikedStatus The new isLiked status.
   * @param newLikesCount The new likesCount.
   */
  private updatePostInSubjects(postId: string, newLikedStatus: boolean, newLikesCount: number) {
    const updateSubject = (subject: BehaviorSubject<Post[]>) => {
      const currentPosts = subject.getValue();
      const updatedPosts = currentPosts.map(post =>
        post.id === postId ? { ...post, isLiked: newLikedStatus, likesCount: newLikesCount } : post
      );
      subject.next(updatedPosts);
    };

    updateSubject(this.homePosts);
    // If the post is also in userPostsSubject (profile page), update it there too
    updateSubject(this.userPostsSubject);
  }

  /**
   * Helper to find a post by ID across both BehaviorSubjects.
   */
  private findPostInSubjects(postId: string): Post | undefined {
    let post = this.homePosts.getValue().find(p => p.id === postId);
    if (!post) {
      post = this.userPostsSubject.getValue().find(p => p.id === postId);
    }
    return post;
  }
}
