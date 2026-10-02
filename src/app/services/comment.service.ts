import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CommentPage, CommentResponse } from '../models/comment.model';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private readonly apiService = inject(ApiService);

  getComments(postId: string, limit: number = 15, cursor?: string | null): Observable<CommentPage> {
    let params = new HttpParams().set('limit', limit.toString());
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    return this.apiService.get<CommentPage>(`/comments/post/${postId}`, { params });
  }

  createComment(postId: string, content: string): Observable<CommentResponse> {
    return this.apiService.post<CommentResponse>(`/comments/post/${postId}`, { content });
  }

  deleteComment(commentId: number): Observable<void> {
    return this.apiService.delete<void>(`/comments/${commentId}`);
  }
}
