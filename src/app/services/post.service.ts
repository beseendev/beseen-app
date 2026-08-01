import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, of, Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { Post, UserInfo } from '../models/post.model';
import { ApiService } from './api.service';
import { HttpParams } from '@angular/common/http';
import { FileType } from '../models/upload.model';
import { InvitePageResponse, InviteResponse } from '../models/player-chat.models';

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
    position?: string;
  };
  mediaUrl: string;
  mediaType: FileType;
  caption: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
  position?: string;
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

  constructor() { }

  private mapPostResponseToPost(postResponse: PostResponseDto): Post {
    const user: UserInfo = {
      id: String(postResponse.user.id || postResponse.athleteId || ''),
      username: postResponse.user.username,
      urlPerfil: postResponse.user.urlPerfil,
      position: postResponse.user.position || postResponse.position
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
      position: postResponse.position || postResponse.user.position,
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
      })
    );
  }

  getPostsByProfileId(profileId: string, limit: number, cursor?: string): Observable<{ posts: Post[], nextCursor: string | null }> {
    let params = new HttpParams().set('limit', limit.toString());
    if (cursor) {
      params = params.set('cursor', cursor);
    }

    return this.apiService.get<PostPageResponseDto>(`/posts/profile/${profileId}`, { params }).pipe(
      map(response => {
        const mappedPosts = response.items.map(postDto => this.mapPostResponseToPost(postDto));
        return { posts: mappedPosts, nextCursor: response.nextCursor };
      })
    );
  }

  updatePostCaption(postId: string, caption: string): Observable<Post> {
    return this.apiService.patch<PostResponseDto>(`/posts/${postId}`, { caption }).pipe(
      map(postDto => this.mapPostResponseToPost(postDto))
    );
  }

  deletePost(postId: string): Observable<void> {
    return this.apiService.delete<void>(`/posts/${postId}`);
  }

  reportPost(postId: string, reason: string): Observable<void> {
    return this.apiService.post<void>(`/posts/${postId}/report`, { reason });
  }

  private homePosts = new BehaviorSubject<Post[]>([]);
  homePosts$ = this.homePosts.asObservable();

  private homeNextCursor: string | null = null;
  private homeHasMorePosts = true;

  loadHomePosts(limit: number = 10, isRefresh: boolean = false): Observable<any> {
    if (!isRefresh && !this.homeHasMorePosts) {
      return of({ posts: [], nextCursor: null });
    }

    let params = new HttpParams().set('limit', limit.toString());
    if (this.homeNextCursor && !isRefresh) {
      params = params.set('cursor', this.homeNextCursor);
    }

    return this.apiService.get<PostPageResponseDto>(`/posts`, { params }).pipe(
      map(response => {
        const mappedPosts = response.items.map(postDto => this.mapPostResponseToPost(postDto));
        return { posts: mappedPosts, nextCursor: response.nextCursor };
      }),
      tap(response => {
        if (isRefresh) {
          this.homePosts.next(response.posts);
        } else {
          const currentPosts = this.homePosts.getValue();
          const existingIds = new Set(currentPosts.map(p => p.id));
          const newPosts = response.posts.filter(p => !existingIds.has(p.id));
          this.homePosts.next([...currentPosts, ...newPosts]);
        }
        this.homeNextCursor = response.nextCursor;
        this.homeHasMorePosts = !!response.nextCursor;
      }),
      map(response => ({ posts: response.posts, nextCursor: response.nextCursor }))
    );
  }

  refreshHomePosts(limit: number = 10): Observable<any> {
    this.homeNextCursor = null;
    this.homeHasMorePosts = true;
    return this.loadHomePosts(limit, true);
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
    return this.apiService.post<void>(`/invites/post/${postId}`, {}).pipe(
      tap(() => {
        const currentPosts = this.homePosts.getValue();
        const updatedPosts = currentPosts.map(post =>
          post.id === postId ? { ...post, inviteStatus: 'PENDING' as any } : post
        );
        this.homePosts.next(updatedPosts);
      })
    );
  }

  sendInviteToProfile(profileId: string | number): Observable<void> {
    return this.apiService.post<void>(`/invites/profile/${profileId}`, {});
  }

  acceptInvite(inviteId: number): Observable<InviteResponse> {
    return this.apiService.patch<InviteResponse>(`/invites/${inviteId}/accept`, {});
  }

  rejectInvite(inviteId: number): Observable<InviteResponse> {
    return this.apiService.patch<InviteResponse>(`/invites/${inviteId}/reject`, {});
  }

  getInvites(limit: number = 10, page: number = 0, postId?: string): Observable<InvitePageResponse> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('page', page.toString());

    if (postId) {
      params = params.set('postId', postId);
    }
    return this.apiService.get<InvitePageResponse>(`/invites`, { params });
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

  getRankingPosts(limit: number = 10, page: number = 0): Observable<{ posts: Post[], nextCursor: string | null }> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('page', page.toString());

    return this.apiService.get<PostPageResponseDto>(`/posts/most-liked`, { params }).pipe(
      map(response => {
        const mappedPosts = response.items.map(postDto => this.mapPostResponseToPost(postDto));
        return { posts: mappedPosts, nextCursor: response.nextCursor };
      })
    );
  }

  private updatePostInSubjects(postId: string, newLikedStatus: boolean, newLikesCount: number) {
    const updateSubject = (subject: BehaviorSubject<Post[]>) => {
      const currentPosts = subject.getValue();
      const updatedPosts = currentPosts.map(post =>
        post.id === postId ? { ...post, isLiked: newLikedStatus, likesCount: newLikesCount } : post
      );
      subject.next(updatedPosts);
    };

    updateSubject(this.homePosts);
    updateSubject(this.userPostsSubject);
  }

  private findPostInSubjects(postId: string): Post | undefined {
    let post = this.homePosts.getValue().find(p => p.id === postId);
    if (!post) {
      post = this.userPostsSubject.getValue().find(p => p.id === postId);
    }
    return post;
  }
}
