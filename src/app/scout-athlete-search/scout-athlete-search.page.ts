import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  IonAvatar,
  IonButton,
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSelect,
  IonSelectOption
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { arrowBackOutline, closeOutline, locationOutline, personCircleOutline, searchOutline } from 'ionicons/icons';
import { AthleteGender, ProfileResponse } from '../models/profile.model';
import { SCOUT_POSITION_OPTIONS, ScoutPosition } from '../models/scout-profile.model';
import { AuthService, JwtPayload } from '../services/auth.service';

type DominantFoot = NonNullable<ProfileResponse['dominantFoot']>;

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

const MOCK_ATHLETES: ProfileResponse[] = [
  {
    id: 9001,
    name: 'Lucas Ferreira',
    fullName: 'Lucas Ferreira',
    role: 'JOGADOR',
    position: 'Meia',
    dominantFoot: 'RIGHT',
    gender: 'MALE',
    cidade: 'Florianopolis',
    estado: 'SC',
    height: '1.74'
  },
  {
    id: 9002,
    name: 'Mariana Souza',
    fullName: 'Mariana Souza',
    role: 'JOGADOR',
    position: 'Atacante',
    dominantFoot: 'LEFT',
    gender: 'FEMALE',
    cidade: 'Curitiba',
    estado: 'PR',
    height: '1.68'
  },
  {
    id: 9003,
    name: 'Rafael Lima',
    fullName: 'Rafael Lima',
    role: 'JOGADOR',
    position: 'Zagueiro',
    dominantFoot: 'BOTH',
    gender: 'MALE',
    cidade: 'Sao Paulo',
    estado: 'SP',
    height: '1.86'
  },
  {
    id: 9004,
    name: 'Ana Martins',
    fullName: 'Ana Martins',
    role: 'JOGADOR',
    position: 'Ponta',
    dominantFoot: 'RIGHT',
    gender: 'FEMALE',
    cidade: 'Joinville',
    estado: 'SC',
    height: '1.63'
  },
  {
    id: 9005,
    name: 'Pedro Henrique',
    fullName: 'Pedro Henrique',
    role: 'JOGADOR',
    position: 'Goleiro',
    dominantFoot: 'LEFT',
    gender: 'MALE',
    cidade: 'Porto Alegre',
    estado: 'RS',
    height: '1.91'
  },
  {
    id: 9006,
    name: 'Beatriz Nunes',
    fullName: 'Beatriz Nunes',
    role: 'JOGADOR',
    position: 'Volante',
    dominantFoot: 'BOTH',
    gender: 'FEMALE',
    cidade: 'Belo Horizonte',
    estado: 'MG',
    height: '1.70'
  }
];

@Component({
  selector: 'app-scout-athlete-search',
  templateUrl: './scout-athlete-search.page.html',
  styleUrls: ['./scout-athlete-search.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonAvatar,
    IonButton,
    IonContent,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonSelect,
    IonSelectOption
  ]
})
export class ScoutAthleteSearchPage implements OnInit {
  athletes: ProfileResponse[] = [];
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

  constructor() {
    addIcons({ arrowBackOutline, closeOutline, locationOutline, personCircleOutline, searchOutline });
  }

  ngOnInit(): void {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    if (decodedToken?.role !== 'CLUBE') {
      this.router.navigateByUrl('/player-home');
      return;
    }

    this.applyFilters();
  }

  goBack(): void {
    this.router.navigateByUrl('/scout-home');
  }

  onSearchInput(event: CustomEvent): void {
    this.filters.query = String(event.detail?.value ?? '');
    this.applyFilters();
  }

  applyFilters(): void {
    const query = this.normalizeSearchValue(this.filters.query);

    this.athletes = MOCK_ATHLETES.filter(athlete => {
      const matchesQuery = !query || [
        athlete.name,
        athlete.fullName,
        athlete.cidade
      ].some(value => this.normalizeSearchValue(value).includes(query));

      const matchesPosition = !this.filters.position || athlete.position === this.filters.position;
      const matchesDominantFoot = !this.filters.dominantFoot || athlete.dominantFoot === this.filters.dominantFoot;
      const matchesGender = !this.filters.gender || athlete.gender === this.filters.gender;

      return matchesQuery && matchesPosition && matchesDominantFoot && matchesGender;
    });
  }

  refresh(event?: CustomEvent): void {
    this.applyFilters();
    this.completeEvent(event);
  }

  clearFilters(): void {
    this.filters = {
      query: '',
      position: '',
      dominantFoot: '',
      gender: ''
    };
    this.applyFilters();
  }

  openAthleteProfile(athlete: ProfileResponse): void {
    this.router.navigate(['/profile-player', athlete.id]);
  }

  trackByAthleteId(_: number, athlete: ProfileResponse): number {
    return athlete.id;
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
    return this.genderOptions.find(option => option.value === gender)?.label || 'Genero nao informado';
  }

  getDominantFootLabel(dominantFoot?: DominantFoot): string {
    return this.dominantFootOptions.find(option => option.value === dominantFoot)?.label || 'Pe nao informado';
  }

  private normalizeSearchValue(value?: string | null): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private completeEvent(event?: CustomEvent): void {
    const target = event?.target as HTMLIonRefresherElement | undefined;
    target?.complete();
  }
}
