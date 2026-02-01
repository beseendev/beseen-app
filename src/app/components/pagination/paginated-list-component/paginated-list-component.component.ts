// paginated-list.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import {
  IonList,
  IonItem,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSpinner,
  IonSearchbar,
  IonText
} from '@ionic/angular/standalone';

export interface PaginatedListConfig<T> {
  itemTemplate: (item: T) => string;

  trackByFn: (item: T) => any;

  emptyMessage?: string;
  loadingMessage?: string;
  searchPlaceholder?: string;

  itemClass?: string;
  listClass?: string;
}

@Component({
  selector: 'app-paginated-list',
  templateUrl: './paginated-list.component.html',
  styleUrls: ['./paginated-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonList,
    IonItem,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSpinner,
    IonSearchbar,
    IonText
  ]
})
export class PaginatedListComponent<T> implements OnInit, OnDestroy {
  @Input() config!: PaginatedListConfig<T>;
  @Input() state$!: any; // Observable do PaginationState
  @Input() loadItemsFn!: (searchTerm: string) => void;
  @Input() loadMoreFn!: () => void;

  @Output() itemSelected = new EventEmitter<T>();
  @Output() searchChanged = new EventEmitter<string>();

  items: T[] = [];
  isLoading = false;
  hasMore = false;
  error: string | null = null;

  private subscription = new Subscription();

  ngOnInit(): void {
    this.subscription.add(
      this.state$.subscribe((state: any) => {
        this.items = state.items;
        this.isLoading = state.isLoading;
        this.hasMore = state.hasMore;
        this.error = state.error;
      })
    );
  }

  onSearch(ev: any): void {
    const query = (ev?.detail?.value ?? '').toString().trim();
    this.searchChanged.emit(query);

    if (this.loadItemsFn) {
      this.loadItemsFn(query);
    }
  }

  loadMore(event: any): void {
    if (this.isLoading || !this.hasMore) {
      event.target.complete();
      return;
    }

    if (this.loadMoreFn) {
      this.loadMoreFn();
    }

    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  onItemClick(item: T): void {
    this.itemSelected.emit(item);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
