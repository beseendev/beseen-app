import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { arrowBackOutline, closeOutline, locationOutline, searchOutline } from 'ionicons/icons';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { AthleteGender, AthleteSearchParams, AthleteSearchResult, Profile } from '../models/profile.model';
import { SCOUT_POSITION_OPTIONS, ScoutPosition } from '../models/scout-profile.model';
import { AuthService, JwtPayload } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';
import { PlayerCardComponent } from '../components/player-card/player-card.component';

type DominantFoot = NonNullable<AthleteSearchResult['dominantFoot']>;

const SEARCH_DEBOUNCE_MS = 500;
const MIN_QUERY_LENGTH = 3;
const PAGE_SIZE = 10;

/** Rótulo em português (ScoutPosition) -> nome do enum PlayerPosition no backend. */
const POSITION_API_VALUE: Record<ScoutPosition, string> = {
  Goleiro: 'GOLEIRO',
  Zagueiro: 'ZAGUEIRO',
  Lateral: 'LATERAL',
  Volante: 'VOLANTE',
  Meia: 'MEIA',
  Atacante: 'ATACANTE',
  Ponta: 'PONTA'
};

interface AthleteSearchFilters {
  query: string;
  position: ScoutPosition | '';
  dominantFoot: DominantFoot | '';
  gender: AthleteGender | '';
}

interface DominantFootOption {
  value: DominantFoot;
  label: string;
}

@Component({
  selector: 'app-scout-athlete-search',
  templateUrl: './scout-athlete-search.page.html',
  styleUrls: ['./scout-athlete-search.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonContent,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    PlayerCardComponent
  ]
})
export class ScoutAthleteSearchPage implements OnInit, OnDestroy {
  athletes: AthleteSearchResult[] = [];
  loading = false;
  loadingMore = false;
  hasMore = true;
  errorMessage: string | null = null;
  filters: AthleteSearchFilters = {
    query: '',
    position: '',
    dominantFoot: '',
    gender: ''
  };
  readonly positionOptions = SCOUT_POSITION_OPTIONS;
  readonly dominantFootOptions: DominantFootOption[] = [
    { value: 'RIGHT', label: 'Direito' },
    { value: 'LEFT', label: 'Esquerdo' },
    { value: 'BOTH', label: 'Ambidestro' }
  ];
  readonly genderOptions: Array<{ value: AthleteGender; label: string }> = [
    { value: 'MALE', label: 'Masculino' },
    { value: 'FEMALE', label: 'Feminino' }
  ];

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);
  private readonly queryInput$ = new Subject<string>();
  private queryInputSubscription?: Subscription;
  private currentPage = 0;

  constructor() {
    addIcons({ arrowBackOutline, closeOutline, locationOutline, searchOutline });
  }

  ngOnInit(): void {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    if (decodedToken?.role !== 'CLUBE') {
      this.router.navigateByUrl('/player-home');
      return;
    }

    this.queryInputSubscription = this.queryInput$
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged())
      .subscribe(query => {
        if (query.length === 0 || query.length >= MIN_QUERY_LENGTH) {
          this.search();
        }
      });

    this.search();
  }

  ngOnDestroy(): void {
    this.queryInputSubscription?.unsubscribe();
  }

  goBack(): void {
    this.router.navigateByUrl('/scout-home');
  }

  onSearchInput(event: CustomEvent): void {
    this.filters.query = String(event.detail?.value ?? '');
    this.queryInput$.next(this.filters.query);
  }

  onSearchClear(): void {
    this.filters.query = '';
    this.search();
  }

  onFilterChange(): void {
    this.search();
  }

  search(onComplete?: () => void): void {
    this.currentPage = 0;
    this.hasMore = true;
    this.loading = true;
    this.errorMessage = null;

    this.fetchPage(0, { onComplete });
  }

  loadMore(event: CustomEvent): void {
    if (this.loading || this.loadingMore || !this.hasMore) {
      this.completeInfiniteScroll(event);
      return;
    }

    this.loadingMore = true;
    this.fetchPage(this.currentPage + 1, { infiniteScrollEvent: event });
  }

  private fetchPage(page: number, options: { onComplete?: () => void; infiniteScrollEvent?: CustomEvent } = {}): void {
    this.profileService.searchAthletes(this.buildSearchParams(page)).pipe(
      finalize(() => {
        this.loading = false;
        this.loadingMore = false;
        options.onComplete?.();
        this.completeInfiniteScroll(options.infiniteScrollEvent);
      })
    ).subscribe({
      next: response => {
        const content = response.content ?? [];
        this.athletes = page === 0 ? content : [...this.athletes, ...content];
        this.currentPage = page;
        this.hasMore = !response.last;
      },
      error: () => {
        if (page === 0) {
          this.athletes = [];
        }
        this.hasMore = false;
        this.errorMessage = 'Não foi possível carregar os atletas. Tente novamente.';
      }
    });
  }

  refresh(event?: CustomEvent): void {
    this.search(() => this.completeEvent(event));
  }

  clearFilters(): void {
    this.filters = {
      query: '',
      position: '',
      dominantFoot: '',
      gender: ''
    };
    this.search();
  }

  openAthleteProfile(athlete: AthleteSearchResult): void {
    this.router.navigate(['/profile-player', athlete.id]);
  }

  trackByAthleteId(_: number, athlete: AthleteSearchResult): number {
    return athlete.id;
  }

  toPlayerCardProfile(athlete: AthleteSearchResult): Partial<Profile> {
    return {
      name: athlete.fullName,
      urlProfileImage: athlete.urlProfileImage,
      positions: athlete.position ? [athlete.position] : undefined,
      dominantFoot: athlete.dominantFoot ?? undefined,
      gender: athlete.gender,
      ata: athlete.ata ?? undefined,
      def: athlete.def ?? undefined,
      hab: athlete.hab ?? undefined,
      forca: athlete.forca ?? undefined
    };
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.filters.query.trim()
      || this.filters.position
      || this.filters.dominantFoot
      || this.filters.gender
    );
  }

  getGenderLabel(gender?: AthleteGender | null): string {
    return this.genderOptions.find(option => option.value === gender)?.label || 'Gênero não informado';
  }

  getDominantFootLabel(dominantFoot?: DominantFoot | null): string {
    return this.dominantFootOptions.find(option => option.value === dominantFoot)?.label || 'Pé não informado';
  }

  private buildSearchParams(page: number): AthleteSearchParams {
    const params: AthleteSearchParams = { page, size: PAGE_SIZE };
    const trimmedQuery = this.filters.query.trim();

    if (trimmedQuery) {
      params.filter = trimmedQuery;
    }
    if (this.filters.position) {
      params.position = POSITION_API_VALUE[this.filters.position];
    }
    if (this.filters.dominantFoot) {
      params.dominantFoot = this.filters.dominantFoot;
    }
    if (this.filters.gender) {
      params.gender = this.filters.gender;
    }

    return params;
  }

  private completeEvent(event?: CustomEvent): void {
    const target = event?.target as HTMLIonRefresherElement | undefined;
    target?.complete();
  }

  private completeInfiniteScroll(event?: CustomEvent): void {
    const target = event?.target as HTMLIonInfiniteScrollElement | undefined;
    target?.complete();
  }
}
