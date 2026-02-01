import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError, finalize } from 'rxjs/operators';
import { ApiService } from './api.service';
import { HttpParams } from '@angular/common/http';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface PaginationState<T> {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  currentPage: number;
  searchTerm: string;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PaginationService {
  private apiService = inject(ApiService);

  createPaginationState<T>(
    endpoint: string,
    defaultPageSize: number = 20,
    defaultSort: string = 'id,desc'
  ) {
    const stateSubject = new BehaviorSubject<PaginationState<T>>({
      items: [],
      isLoading: false,
      hasMore: true,
      currentPage: 0,
      searchTerm: '',
      error: null
    });

    const state$ = stateSubject.asObservable();

    return {
      state$,

      loadItems: (searchTerm: string = ''): Observable<T[]> => {
        const currentState = stateSubject.value;
        if (currentState.isLoading) {
          return of(currentState.items);
        }

        const newState: PaginationState<T> = {
          ...currentState,
          isLoading: true,
          hasMore: true,
          currentPage: 0,
          searchTerm,
          error: null
        };
        stateSubject.next(newState);

        return this.fetchItems<T>(endpoint, searchTerm, 0, defaultPageSize, defaultSort).pipe(
          tap(items => {
            stateSubject.next({
              ...newState,
              items,
              isLoading: false,
              hasMore: items.length === defaultPageSize
            });
          }),
          catchError(error => {
            stateSubject.next({
              ...newState,
              isLoading: false,
              error: 'Erro ao carregar itens'
            });
            console.error('Erro ao carregar itens:', error);
            return of([]);
          })
        );
      },

      loadMoreItems: (): Observable<T[]> => {
        const currentState = stateSubject.value;
        if (currentState.isLoading || !currentState.hasMore) {
          return of(currentState.items);
        }

        const newState: PaginationState<T> = {
          ...currentState,
          isLoading: true,
          error: null
        };
        stateSubject.next(newState);

        const nextPage = currentState.currentPage + 1;

        return this.fetchItems<T>(
          endpoint,
          currentState.searchTerm,
          nextPage,
          defaultPageSize,
          defaultSort
        ).pipe(
          tap(newItems => {
            const allItems = [...currentState.items, ...newItems];
            stateSubject.next({
              ...newState,
              items: allItems,
              isLoading: false,
              currentPage: nextPage,
              hasMore: newItems.length === defaultPageSize
            });
          }),
          catchError(error => {
            stateSubject.next({
              ...newState,
              isLoading: false,
              error: 'Erro ao carregar mais itens'
            });
            console.error('Erro ao carregar mais itens:', error);
            return of([]);
          })
        );
      },

      reset: (): void => {
        stateSubject.next({
          items: [],
          isLoading: false,
          hasMore: true,
          currentPage: 0,
          searchTerm: '',
          error: null
        });
      },

      updateItem: (itemId: any, updateFn: (item: T) => T): void => {
        const currentState = stateSubject.value;
        const updatedItems = currentState.items.map(item => {
          if ((item as any).id === itemId) {
            return updateFn(item);
          }
          return item;
        });

        stateSubject.next({
          ...currentState,
          items: updatedItems
        });
      },

      removeItem: (itemId: any): void => {
        const currentState = stateSubject.value;
        const filteredItems = currentState.items.filter(item =>
          (item as any).id !== itemId
        );

        stateSubject.next({
          ...currentState,
          items: filteredItems
        });
      }
    };
  }

  private fetchItems<T>(
    endpoint: string,
    filter: string,
    page: number,
    size: number,
    sort: string
  ): Observable<T[]> {
    const params = new HttpParams()
      .set('filter', filter || '')
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    return this.apiService.get<PageResponse<T>>(endpoint, { params }).pipe(
      map(response => response.content)
    );
  }
}
