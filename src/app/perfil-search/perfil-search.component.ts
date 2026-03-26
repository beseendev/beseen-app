import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild, ElementRef
} from '@angular/core';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError } from 'rxjs/operators';
import { ProfileService } from "../services/profile.service";
import { IonIcon, IonAvatar, IonSearchbar, IonList, IonItem, IonLabel, IonInfiniteScroll, IonInfiniteScrollContent, IonSpinner } from '@ionic/angular/standalone';
import { CommonModule } from "@angular/common";
import {ProfileResponse} from "../models/profile.model";

@Component({
  selector: 'app-perfil-search',
  templateUrl: './perfil-search.component.html',
  styleUrls: ['./perfil-search.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonIcon,
    IonAvatar,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSpinner
  ]
})
export class PerfilSearchComponent implements OnInit, OnDestroy, OnChanges {
  @Output() selectProfile = new EventEmitter<ProfileResponse>();
  @Input() isOpen = false;
  @ViewChild('searchBarRef', { read: ElementRef }) searchBarRef!: ElementRef;

  results: ProfileResponse[] = [];
  private query$ = new Subject<string>();
  private sub!: Subscription;

  private currentQuery = '';
  page = 0;
  size = 20;
  loading = false;
  hasMore = true;

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.sub = this.query$.pipe(
      debounceTime(500),
      distinctUntilChanged(),
    ).subscribe(q => {
      this.currentQuery = q;
      this.resetAndLoad();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && !changes['isOpen'].currentValue) {
      this.clearSearch();
    }
  }

  private resetAndLoad() {
    this.page = 0;
    this.results = [];
    this.hasMore = true;
    if (!this.currentQuery || this.currentQuery.trim().length === 0) {
      return;
    }
    this.loadPage();
  }

  private loadPage(event?: any) {
    if (this.loading || !this.hasMore) {
      if (event && event.target) event.target.complete();
      return;
    }

    this.loading = true;

    this.profileService.searchProfiles(this.currentQuery, this.page, this.size)
      .pipe(
        catchError((error) => {
          console.error('Erro na busca:', error);
          return of([]);
        })
      )
      .subscribe(newResults => {
        this.loading = false;

        if (this.page === 0) {
          this.results = newResults;
        } else {
          this.results = [...this.results, ...newResults];
        }

        if (newResults.length < this.size) {
          this.hasMore = false;
        } else {
          this.page += 1;
        }

        if (event && event.target) event.target.complete();
      }, () => {
        this.loading = false;
        if (event && event.target) event.target.complete();
      });
  }

  onInput(ev: any) {
    const q = (ev?.detail?.value ?? '').toString().trim();
    this.query$.next(q);
    if (q === '') {
      this.clearSearch();
    }
  }

  onClear() {
    this.clearSearch();
    this.currentQuery = '';
  }

  loadMore(event: any) {
    this.loadPage(event);
  }

  pick(user: ProfileResponse) {
    this.selectProfile.emit(user);
    this.clearSearch();
    this.currentQuery = '';
  }

  clearResults() {
    this.results = [];
    this.page = 0;
    this.hasMore = true;
  }

  clearSearch() {
    this.clearResults();
    this.currentQuery = '';

    if (this.searchBarRef && this.searchBarRef.nativeElement) {
      const input = this.searchBarRef.nativeElement.querySelector('input');
      if (input) {
        input.value = '';

        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('ionChange', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  getDisplayName(user: ProfileResponse): string {
    return user.fullName;
  }

  getProfileImage(user: ProfileResponse): string | undefined {
    return user.urlProfileImage;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
