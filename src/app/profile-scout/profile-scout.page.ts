import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonContent, IonAvatar, IonLabel, IonGrid, IonRow, IonCol, IonRefresher, IonRefresherContent, IonItem, IonList, IonText, IonInput, IonTextarea, ToastController, IonSelect, IonSelectOption, IonSpinner, IonBadge } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, createOutline, personAddOutline, chatbubbleOutline, personCircleOutline, briefcaseOutline, calendarOutline, businessOutline, globeOutline, informationCircleOutline, searchOutline, checkmarkOutline, closeOutline, languageOutline, trophyOutline, peopleOutline, personOutline } from 'ionicons/icons';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileService } from '../services/profile.service';
import { Profile, ProfileScoutCreationRequest } from '../models/profile.model';
import { AuthService } from '../services/auth.service';
import { catchError, of, filter, map, switchMap, tap, finalize } from 'rxjs';
import { SCOUT_TYPE_OPTIONS, SCOUT_MODALITY_OPTIONS, SCOUT_AGE_CATEGORIES, SCOUT_POSITION_OPTIONS } from '../models/scout-profile.model';

@Component({
  selector: 'app-profile-scout',
  templateUrl: './profile-scout.page.html',
  styleUrls: ['./profile-scout.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonContent,
    IonAvatar,
    IonLabel,
    IonGrid,
    IonRow,
    IonCol,
    IonRefresher,
    IonRefresherContent,
    IonItem,
    IonList,
    IonText,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonBadge
  ],
})
export class ProfileScoutPage implements OnInit {
  private readonly LOCAL_PROFILE_STORAGE_KEY = 'beseen-scout-profile-overrides';
  profileId: string | null = null;
  profile: any | null = null;
  isMyProfile = false;
  isEditing = false;
  draftProfile: {
    tipoOlheiro?: string;
    tipoOlheiroOutroTexto?: string;
    organizacaoOuClube?: string;
    cargoOuFuncao?: string;
    modalidade?: string;
    categoriasIdadeAlvo?: string[];
    posicoesInteresse?: string[];
    regiaoAtuacaoTexto?: string;
    sobreMim?: string;
    oQueBuscaNoBeSeen?: string;
  } = {};
  isLoading = false;

  readonly scoutTypeOptions = SCOUT_TYPE_OPTIONS;
  readonly modalityOptions = SCOUT_MODALITY_OPTIONS;
  readonly ageCategoryOptions = SCOUT_AGE_CATEGORIES;
  readonly positionOptions = SCOUT_POSITION_OPTIONS;

  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private toastController = inject(ToastController);

  constructor() {
    addIcons({
      arrowBackOutline,
      createOutline,
      personAddOutline,
      chatbubbleOutline,
      personCircleOutline,
      briefcaseOutline,
      calendarOutline,
      businessOutline,
      globeOutline,
      informationCircleOutline,
      searchOutline,
      checkmarkOutline,
      closeOutline,
      languageOutline,
      trophyOutline,
      peopleOutline,
      personOutline
    });
  }

  ngOnInit() {
    this.activatedRoute.paramMap.pipe(
      switchMap(params => {
        this.profileId = params.get('userId');
        return this.authService.getCurrentUser().pipe(
          filter(user => !!user),
          map(user => user.id),
          tap(currentUserId => {
            this.isMyProfile = !this.profileId || this.profileId === currentUserId;
          }),
          switchMap(() => this.profileService.getProfile(this.profileId ?? undefined).pipe(
            catchError(() => of(this.getMockProfile(this.profileId)))
          ))
        );
      }),
      tap(profile => {
        this.profile = this.applyLocalOverrides(profile);
        if (!this.profileId && profile) {
          this.profileId = profile.id;
        }
        this.syncDraftProfile();
        this.resetAndLoadUserPosts(); // Mantendo o padrão, embora não haja seção de posts visível
      })
    ).subscribe();
  }

  // Método mantido para seguir o padrão do profile-player
  private resetAndLoadUserPosts() {
    console.log('Reset and load user posts - No posts section in scout profile');
  }

  goBack() {
    this.router.navigateByUrl('/scout-home');
  }

  startEditing(): void {
    if (!this.isMyProfile || !this.profile) {
      return;
    }

    this.isEditing = true;
    this.syncDraftProfile();
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.syncDraftProfile();
  }

  async saveProfileEdits(): Promise<void> {
    if (!this.profile) {
      return;
    }

    this.isLoading = true;

    // Simulação de atualização no backend (mantendo o comportamento do MVP do player)
    const updatedFields = {
      tipoOlheiro: this.draftProfile.tipoOlheiro,
      tipoOlheiroOutroTexto: this.draftProfile.tipoOlheiroOutroTexto,
      organizacaoOuClube: this.draftProfile.organizacaoOuClube,
      cargoOuFuncao: this.draftProfile.cargoOuFuncao,
      modalidade: this.draftProfile.modalidade,
      categoriasIdadeAlvo: this.draftProfile.categoriasIdadeAlvo,
      posicoesInteresse: this.draftProfile.posicoesInteresse,
      regiaoAtuacaoTexto: this.draftProfile.regiaoAtuacaoTexto,
      sobreMim: this.draftProfile.sobreMim,
      oQueBuscaNoBeSeen: this.draftProfile.oQueBuscaNoBeSeen,
    };

    setTimeout(() => {
      this.profile = {
        ...this.profile,
        ...updatedFields
      };
      this.persistLocalOverrides(this.profile);
      this.isEditing = false;
      this.isLoading = false;
      this.showToast('Perfil atualizado com sucesso!', 'success');
    }, 1000);
  }

  private async showToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'top'
    });
    toast.present();
  }

  followUser() {
    console.log('Seguir olheiro', this.profile?.fullName);
  }

  startChat() {
    console.log('Iniciar chat com olheiro', this.profile?.fullName);
  }

  async refreshProfile(event: any) {
    this.profileService.getProfile(this.profileId ?? undefined).subscribe({
      next: (profile) => {
        this.profile = this.applyLocalOverrides(profile);
        this.syncDraftProfile();
        event.target.complete();
      },
      error: () => {
        event.target.complete();
      }
    });
  }

  getDisplayRole(role: string | undefined): string {
    if (role === 'CLUBE') {
      return 'OLHEIRO';
    }
    return role ?? '';
  }

  private syncDraftProfile(): void {
    if (!this.profile) {
      this.draftProfile = {};
      return;
    }

    this.draftProfile = {
      tipoOlheiro: this.profile.tipoOlheiro || 'Clube',
      tipoOlheiroOutroTexto: this.profile.tipoOlheiroOutroTexto || '',
      organizacaoOuClube: this.profile.organizacaoOuClube || '',
      cargoOuFuncao: this.profile.cargoOuFuncao || '',
      modalidade: this.profile.modalidade || 'Futebol de campo',
      categoriasIdadeAlvo: Array.isArray(this.profile.categoriasIdadeAlvo) ? [...this.profile.categoriasIdadeAlvo] : [],
      posicoesInteresse: Array.isArray(this.profile.posicoesInteresse) ? [...this.profile.posicoesInteresse] : [],
      regiaoAtuacaoTexto: this.profile.regiaoAtuacaoTexto || '',
      sobreMim: this.profile.sobreMim || '',
      oQueBuscaNoBeSeen: this.profile.oQueBuscaNoBeSeen || '',
    };
  }

  private applyLocalOverrides(profile: any): any {
    if (!profile || !this.isMyProfile) {
      return profile;
    }

    try {
      const rawValue = localStorage.getItem(this.LOCAL_PROFILE_STORAGE_KEY);
      if (!rawValue) {
        return profile;
      }

      const overrides = JSON.parse(rawValue);
      return {
        ...profile,
        ...overrides,
      };
    } catch {
      return profile;
    }
  }

  private persistLocalOverrides(profile: any): void {
    localStorage.setItem(this.LOCAL_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }

  private getMockProfile(profileId: string | null): any {
    const scouts: Record<string, any> = {
      'scout-1': {
        id: 'scout-1',
        name: 'Ricardo Scout',
        fullName: 'Ricardo Scout de Castro',
        role: 'CLUBE',
        tipoOlheiro: 'Clube',
        organizacaoOuClube: 'BeSeen FC',
        cargoOuFuncao: 'Scout Sênior',
        dateOfBirth: '1985-05-20',
        modalidade: 'Futebol de campo',
        categoriasIdadeAlvo: ['Sub-17', 'Sub-20'],
        posicoesInteresse: ['Atacante', 'Meia'],
        regiaoAtuacaoTexto: 'São Paulo e Rio de Janeiro',
        sobreMim: 'Experiência de 15 anos observando atletas de base em grandes clubes do Brasil.',
        oQueBuscaNoBeSeen: 'Novos talentos com perfil técnico elevado para as categorias de base.',
        documentoVerificado: true
      },
      'scout-2': {
        id: 'scout-2',
        name: 'Carlos Agente',
        fullName: 'Carlos Agente Silva',
        role: 'CLUBE',
        tipoOlheiro: 'Agente',
        organizacaoOuClube: 'Elite Sports Management',
        cargoOuFuncao: 'Diretor Esportivo',
        dateOfBirth: '1978-10-12',
        modalidade: 'Futebol de campo',
        categoriasIdadeAlvo: ['Sub-20', 'Profissional'],
        posicoesInteresse: ['Goleiro', 'Zagueiro'],
        regiaoAtuacaoTexto: 'Brasil e Exterior',
        sobreMim: 'Agente licenciado focado em carreira internacional.',
        oQueBuscaNoBeSeen: 'Atletas prontos para o mercado europeu.',
        documentoVerificado: true
      }
    };

    return scouts[profileId || 'scout-1'] || scouts['scout-1'];
  }
}
