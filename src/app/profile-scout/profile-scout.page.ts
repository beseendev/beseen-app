import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonContent, IonAvatar, IonLabel, IonGrid, IonRow, IonCol, IonRefresher, IonRefresherContent, IonItem, IonList, IonText, IonInput, IonTextarea, ToastController, IonSelect, IonSelectOption, IonSpinner, IonBadge, ActionSheetController, AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, createOutline, personAddOutline, chatbubbleOutline, personCircleOutline, briefcaseOutline, calendarOutline, businessOutline, globeOutline, informationCircleOutline, searchOutline, checkmarkOutline, closeOutline, languageOutline, trophyOutline, peopleOutline, personOutline, imageOutline, ellipsisHorizontal, banOutline } from 'ionicons/icons';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileService } from '../services/profile.service';
import { Profile, ProfileScoutCreationRequest } from '../models/profile.model';
import { AuthService } from '../services/auth.service';
import { catchError, of, filter, map, switchMap, tap, finalize } from 'rxjs';
import { SCOUT_TYPE_OPTIONS, SCOUT_MODALITY_OPTIONS, SCOUT_AGE_CATEGORIES, SCOUT_POSITION_OPTIONS } from '../models/scout-profile.model';
import { environment } from '../../environments/environment';
import {IonicModule} from "@ionic/angular";
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FileType } from '../models/upload.model';
import { BlockService } from '../services/block.service';

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
  profileId: string | null = null;
  profile: Profile | null = null;
  isMyProfile = false;
  isEditing = false;
  isUploadingPhoto = false;
  draftProfile: {
    tipoOlheiro?: string;
    tipoOlheiroOutroTexto?: string;
    organizacaoOuClube?: string;
    cargoOuFuncao?: string;
    cidade?: string;
    estado?: string;
    pais?: string;
    modalidade?: string;
    categoriasIdadeAlvo?: string[];
    posicoesInteresse?: string[];
    regiaoAtuacaoTexto?: string;
    linkReferencia?: string;
    bio?: string;
    oQueBuscaNoBeSeen?: string;
  } = {};
  isLoading = false;

  readonly scoutTypeOptions = SCOUT_TYPE_OPTIONS;
  readonly modalityOptions = SCOUT_MODALITY_OPTIONS;
  readonly ageCategoryOptions = SCOUT_AGE_CATEGORIES;
  readonly positionOptions = SCOUT_POSITION_OPTIONS;

  private profileService = inject(ProfileService);
  private blockService = inject(BlockService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private toastController = inject(ToastController);
  private actionSheetCtrl = inject(ActionSheetController);
  private alertCtrl = inject(AlertController);

  get isBlockedByMe(): boolean {
    return !this.isMyProfile && !!this.profile?.blockedByMe;
  }

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
      personOutline,
      imageOutline,
      ellipsisHorizontal,
      banOutline
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
          switchMap(() => this.profileService.getProfile(this.profileId ?? undefined))
        );
      }),
      tap(profile => {
        this.profile = profile;
        if (this.profile) {
          const rawAvatar = this.profile.urlProfileImage || this.profile.urlPerfil || this.profile.fotoPerfilUrl || null;
          this.profile.urlProfileImage = this.normalizeAvatarUrl(rawAvatar);
        }
        if (!this.profileId && profile) {
          this.profileId = profile.id;
        }
        this.syncDraftProfile();
        this.resetAndLoadUserPosts();
      })
    ).subscribe();
  }

  openSupport() {
    this.router.navigate(['/suporte']);
  }

  async openProfileOptions() {
    const actionSheet = await this.actionSheetCtrl.create({
      cssClass: 'be-action-sheet',
      buttons: [
        {
          text: 'Bloquear usuário',
          role: 'destructive',
          icon: banOutline,
          handler: () => {
            this.confirmBlock();
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel',
          icon: closeOutline
        }
      ]
    });
    await actionSheet.present();
  }

  async confirmBlock() {
    if (!this.profile) {
      return;
    }

    const displayName = this.profile.fullName || this.profile.name || 'usuário';
    const firstName = displayName.split(' ')[0];
    const alert = await this.alertCtrl.create({
      header: `Bloquear ${firstName}?`,
      message: 'Você não verá mais mensagens, convites ou interações deste olheiro. Ele não será avisado sobre o bloqueio.',
      cssClass: 'be-alert-confirm',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Bloquear',
          role: 'destructive',
          handler: () => {
            this.blockUser();
          }
        }
      ]
    });
    await alert.present();
  }

  private blockUser() {
    if (!this.profileId) {
      return;
    }

    this.blockService.blockUser(this.profileId).subscribe({
      next: () => {
        this.reloadProfile();
      },
      error: (err) => {
        console.error('Error blocking user', err);
      }
    });
  }

  unblockUser() {
    if (!this.profileId) {
      return;
    }

    this.blockService.unblockUser(this.profileId).subscribe({
      next: () => {
        this.reloadProfile();
      },
      error: (err) => {
        console.error('Error unblocking user', err);
      }
    });
  }

  private reloadProfile() {
    this.profileService.getProfile(this.profileId ?? undefined).subscribe({
      next: (profile) => {
        this.profile = profile;
        if (this.profile) {
          const rawAvatar = this.profile.urlProfileImage || this.profile.urlPerfil || this.profile.fotoPerfilUrl || null;
          this.profile.urlProfileImage = this.normalizeAvatarUrl(rawAvatar);
        }
        this.syncDraftProfile();
      },
      error: (err) => {
        console.error('Error reloading profile', err);
      }
    });
  }

  private normalizeAvatarUrl(rawUrl: string | null): string | null {
    if (!rawUrl) {
      return null;
    }

    const url = rawUrl.trim();
    if (!url) {
      return null;
    }

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }

    if (url.startsWith('//')) {
      return `https:${url}`;
    }

    const baseApiUrl = environment.apiUrl;
    if (url.startsWith('/') && baseApiUrl) {
      const baseOrigin = baseApiUrl.replace(/\/beseen\/api$/, '');
      return `${baseOrigin}${url}`;
    }

    return baseApiUrl ? `${baseApiUrl}/${url.replace(/^\/+/, '')}` : url;
  }

  private resetAndLoadUserPosts() {
    console.log('Reset and load user posts - No posts section in scout profile');
  }

  goBack() {
    this.router.navigateByUrl('/scout-home');
  }

  async changeProfilePhoto(): Promise<void> {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });

      if (image.webPath) {
        this.isUploadingPhoto = true;

        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const file = new File([blob], `profile_${new Date().getTime()}.${image.format}`, { type: blob.type });

        const uploadRequest = {
          fileName: file.name,
          contentType: file.type,
          category: FileType.PROFILE_IMAGE,
          size: file.size
        };

        this.profileService.getPresignedUrl(uploadRequest).pipe(
          switchMap(uploadResponse => {
            return this.profileService.uploadImageToS3(uploadResponse.uploadUrl, file, file.type).pipe(
              filter((event: any) => event.type === 4),
              map(() => uploadResponse)
            );
          }),
          switchMap(() => this.profileService.notifyUploadComplete()),
          finalize(() => this.isUploadingPhoto = false)
        ).subscribe({
          next: (updatedProfile) => {
            if (this.profile) {
              const rawAvatar = updatedProfile.urlProfileImage || updatedProfile.urlPerfil || null;
              this.profile.urlProfileImage = this.normalizeAvatarUrl(rawAvatar);
            }
          },
          error: (err) => {
            console.error('Error updating profile photo', err);
          }
        });
      }
    } catch (error) {
      console.error('Error selecting photo', error);
    }
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

    const updatedFields = {
      tipoOlheiro: this.draftProfile.tipoOlheiro,
      tipoOlheiroOutroTexto: this.draftProfile.tipoOlheiroOutroTexto,
      organizacaoOuClube: this.draftProfile.organizacaoOuClube,
      cargoOuFuncao: this.draftProfile.cargoOuFuncao,
      cidade: this.draftProfile.cidade,
      estado: this.draftProfile.estado,
      pais: this.draftProfile.pais,
      modalidade: this.draftProfile.modalidade,
      categoriasIdadeAlvo: this.draftProfile.categoriasIdadeAlvo,
      posicoesInteresse: this.draftProfile.posicoesInteresse,
      regiaoAtuacaoTexto: this.draftProfile.regiaoAtuacaoTexto,
      linkReferencia: this.draftProfile.linkReferencia,
      bio: this.draftProfile.bio,
      oQueBuscaNoBeSeen: this.draftProfile.oQueBuscaNoBeSeen,
    };

    this.profileService.updateScoutProfile(updatedFields).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response) => {
        this.profile = {
          ...this.profile,
          ...updatedFields
        } as Profile;
        this.isEditing = false;
      },
      error: (err) => {
        console.error('Failed to update profile', err);
      }
    });
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
        this.profile = profile;
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
      cidade: this.profile.cidade || '',
      estado: this.profile.estado || '',
      pais: this.profile.pais || '',
      modalidade: this.profile.modalidade || 'Futebol de campo',
      categoriasIdadeAlvo: Array.isArray(this.profile.categoriasIdadeAlvo) ? [...this.profile.categoriasIdadeAlvo] : [],
      posicoesInteresse: Array.isArray(this.profile.posicoesInteresse) ? [...this.profile.posicoesInteresse] : [],
      regiaoAtuacaoTexto: this.profile.regiaoAtuacaoTexto || '',
      linkReferencia: this.profile.linkReferencia || '',
      bio: this.profile.bio || '',
      oQueBuscaNoBeSeen: this.profile.oQueBuscaNoBeSeen || '',
    };
  }
}

