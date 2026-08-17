import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonContent, IonAvatar, IonLabel, IonGrid, IonRow, IonCol, IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonList, IonText, IonSegment, IonSegmentButton, IonInput, IonTextarea, IonSelect, IonSelectOption, IonSpinner, IonRange, ActionSheetController, AlertController, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, createOutline, personCircleOutline, briefcaseOutline, calendarOutline, bodyOutline, resizeOutline, scaleOutline, informationCircleOutline, timeOutline, videocamOutline, checkmarkOutline, closeOutline, locationOutline, mapOutline, globeOutline, lockClosedOutline, imageOutline, ellipsisVerticalOutline, ellipsisHorizontal, banOutline, playOutline, trashOutline, chatbubbleOutline, helpCircleOutline, statsChartOutline } from 'ionicons/icons';
import { ActivatedRoute, Router } from '@angular/router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ProfileService } from '../services/profile.service';
import { PostService } from '../services/post.service';
import { AthleteGender, PlayerEvaluationRequest, Profile } from '../models/profile.model';
import { Post } from '../models/post.model';
import { FileType } from '../models/upload.model';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { switchMap, tap, map, filter, finalize } from 'rxjs/operators';
import {AuthService, JwtPayload} from '../services/auth.service';
import { SCOUT_POSITION_OPTIONS, BR_STATE_OPTIONS } from '../models/scout-profile.model';
import { environment } from '../../environments/environment';
import {SubscriptionService} from "../services/subscription.service";
import { BlockService } from '../services/block.service';
import { PlayerCardComponent } from '../components/player-card/player-card.component';

@Component({
  selector: 'app-profile-player',
  templateUrl: './profile-player.page.html',
  styleUrls: ['./profile-player.page.scss'],
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
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonList,
    IonText,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonRange,
    PlayerCardComponent
  ],
})
export class ProfilePlayerPage implements OnInit {
  profileId: string | null = null;
  profile: Profile | null = null;
  isMyProfile = false;
  isScoutViewer = false;
  isEditing = false;
  isUploadingPhoto = false;
  isSendingInvite = false;
  selectedSegment: 'images' | 'videos' = 'videos';
  draftProfile: Partial<Profile> = {};
  draftPositions: string[] = [];
  heightInput = '';
  weightInput = '';
  isLoading = false;

  // Video management
  selectedVideo: Post | null = null;
  isVideoModalOpen = false;
  loadedVideos: { [key: string]: boolean } = {};

  // Avaliação de atributos (ATA/DEF/HAB/FOR)
  isEvaluationModalOpen = false;
  isSubmittingEvaluation = false;
  evaluationForm: PlayerEvaluationRequest = { ata: 50, def: 50, hab: 50, forca: 50 };

  private readonly DEFAULT_POST_LIMIT = 12;
  readonly positionOptions = SCOUT_POSITION_OPTIONS;
  readonly stateOptions = BR_STATE_OPTIONS;
  readonly footOptions = [
    { label: 'Destro', value: 'RIGHT' },
    { label: 'Canhoto', value: 'LEFT' },
    { label: 'Ambidestro', value: 'BOTH' }
  ];
  readonly genderOptions: { label: string; value: AthleteGender }[] = [
    { label: 'Masculino', value: 'MALE' },
    { label: 'Feminino', value: 'FEMALE' }
  ];

  private profileService = inject(ProfileService);
  private blockService = inject(BlockService);
  private postService = inject(PostService);
  private authService = inject(AuthService);
  public subscriptionService = inject(SubscriptionService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private actionSheetCtrl = inject(ActionSheetController);
  private alertCtrl = inject(AlertController);
  private toastController = inject(ToastController);

  private userPostsSubject = new BehaviorSubject<Post[]>([]);
  private selectedSegmentSubject = new BehaviorSubject<'images' | 'videos'>('videos');
  filteredUserPosts$: Observable<Post[]>;
  private userPostsCurrentCursor: string | undefined;
  private userPostsHasMore = true;

  get hasFullAccess(): boolean {
    return this.isMyProfile || this.subscriptionService.hasFullProfileAccess();
  }

  get isBlockedByMe(): boolean {
    return !this.isMyProfile && !!this.profile?.blockedByMe;
  }

  constructor() {
    addIcons({ arrowBackOutline, createOutline, personCircleOutline, briefcaseOutline, calendarOutline, bodyOutline, resizeOutline, scaleOutline, informationCircleOutline, timeOutline, videocamOutline, checkmarkOutline, closeOutline, locationOutline, mapOutline, globeOutline, lockClosedOutline, imageOutline, ellipsisVerticalOutline, ellipsisHorizontal, banOutline, playOutline, trashOutline, chatbubbleOutline, helpCircleOutline, statsChartOutline });

    this.filteredUserPosts$ = combineLatest([
      this.userPostsSubject.asObservable(),
      this.selectedSegmentSubject.asObservable()
    ]).pipe(
      map(([posts, segment]) => posts.filter(post => {
        if (segment === 'images') {
          return post.mediaType === FileType.IMAGE;
        } else if (segment === 'videos') {
          return post.mediaType === FileType.VIDEO;
        }
        return true;
      }))
    );
  }

  ngOnInit() {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    this.isScoutViewer = decodedToken?.role === 'CLUBE';

    this.activatedRoute.paramMap.pipe(
      switchMap(params => {
        this.profileId = params.get('userId');
        return this.authService.getCurrentUser().pipe(
          filter(user => !!user),
          map(user => user.profileId),
          tap(currentUserProfileId => {
            if (!this.profileId) {
              this.isMyProfile = true;
            } else {
              this.isMyProfile = String(this.profileId) === String(currentUserProfileId);
            }
          }),
          switchMap(() => this.profileService.getProfile(this.profileId ?? undefined))
        );
      }),
      tap(profile => {
        this.profile = profile;
        if (this.profile) {
          const rawAvatar = this.profile.urlProfileImage || this.profile.urlPerfil || null;
          this.profile.urlProfileImage = this.normalizeAvatarUrl(rawAvatar);
        }
        if (!this.profileId && profile) {
          this.profileId = profile?.id;
        }
        this.syncDraftProfile();
        this.resetAndLoadUserPosts();
      })
    ).subscribe();
  }

  private normalizeAvatarUrl(rawUrl: string | null | undefined): string | null {
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

  openSupport() {
    this.router.navigate(['/suporte']);
  }

  async openProfileOptions() {
    const buttons: any[] = [];

    if (this.isMyProfile) {
      buttons.push(
        {
          text: 'Editar perfil',
          icon: createOutline,
          handler: () => {
            this.startEditing();
          }
        },
        {
          text: 'Suporte',
          icon: helpCircleOutline,
          handler: () => {
            this.openSupport();
          }
        }
      );
    } else {
      if (this.isScoutViewer && !this.isBlockedByMe) {
        buttons.push({
          text: 'Convidar para conversar',
          icon: chatbubbleOutline,
          handler: () => {
            this.sendInviteToPlayer();
          }
        });
      }

      if (!this.isBlockedByMe) {
        buttons.push({
          text: 'Avaliar jogador',
          icon: statsChartOutline,
          handler: () => {
            this.openEvaluationModal();
          }
        });
      }

      buttons.push({
        text: 'Bloquear usuário',
        role: 'destructive',
        icon: banOutline,
        handler: () => {
          this.confirmBlock();
        }
      });
    }

    buttons.push({
      text: 'Cancelar',
      role: 'cancel',
      icon: closeOutline
    });

    const actionSheet = await this.actionSheetCtrl.create({
      cssClass: 'be-action-sheet',
      buttons
    });
    await actionSheet.present();
  }

  private sendInviteToPlayer(): void {
    if (!this.profileId || this.isSendingInvite) {
      return;
    }

    this.isSendingInvite = true;
    this.postService.sendInviteToProfile(this.profileId).pipe(
      finalize(() => this.isSendingInvite = false)
    ).subscribe({
      next: () => {
        this.showToast('Convite enviado com sucesso!', 'success');
      },
      error: (err) => {
        console.error('Error sending invite to profile', err);
      }
    });
  }

  openEvaluationModal(): void {
    if (!this.profileId || this.isMyProfile) {
      return;
    }

    this.evaluationForm = { ata: 50, def: 50, hab: 50, forca: 50 };
    this.isEvaluationModalOpen = true;
  }

  closeEvaluationModal(): void {
    this.isEvaluationModalOpen = false;
  }

  submitEvaluation(): void {
    if (!this.profileId || this.isSubmittingEvaluation) {
      return;
    }

    this.isSubmittingEvaluation = true;
    this.profileService.evaluatePlayer(this.profileId, this.evaluationForm).pipe(
      finalize(() => this.isSubmittingEvaluation = false)
    ).subscribe({
      next: (attributes) => {
        if (this.profile) {
          this.profile.ata = attributes.ata;
          this.profile.def = attributes.def;
          this.profile.hab = attributes.hab;
          this.profile.forca = attributes.forca;
        }
        this.isEvaluationModalOpen = false;
        this.showToast('Avaliação enviada com sucesso!', 'success');
      },
      error: (err) => {
        console.error('Error evaluating player', err);
        this.showToast('Não foi possível enviar sua avaliação.', 'danger');
      }
    });
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 4000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  async confirmBlock() {
    if (!this.profile) {
      return;
    }

    const firstName = this.profile.name?.split(' ')[0] || 'usuário';
    const alert = await this.alertCtrl.create({
      header: `Bloquear ${firstName}?`,
      message: 'Você não verá mais vídeos, mensagens ou interações deste jogador. Ele não será avisado sobre o bloqueio.',
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
          const rawAvatar = this.profile.urlProfileImage || this.profile.urlPerfil || null;
          this.profile.urlProfileImage = this.normalizeAvatarUrl(rawAvatar);
        }
        this.syncDraftProfile();
        this.resetAndLoadUserPosts();
      },
      error: (err) => {
        console.error('Error reloading profile', err);
      }
    });
  }


  goBack() {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    const isClube = decodedToken?.role === 'CLUBE';

    isClube ? this.router.navigateByUrl('/scout-home') : this.router.navigateByUrl('/player-home');
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
              filter((event: any) => event.type === 4), // HttpEventType.Response
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
    const updateData: Partial<Profile> = {
      bio: (this.draftProfile.bio || '').trim(),
      positions: this.draftPositions,
      height: this.toNumberOrUndefined(this.heightInput),
      weight: this.toNumberOrUndefined(this.weightInput),
      dominantFoot: this.draftProfile.dominantFoot,
      gender: this.draftProfile.gender,
      careerHistory: (this.draftProfile.careerHistory || '').trim(),
      cidade: (this.draftProfile.cidade || '').trim(),
      estado: this.draftProfile.estado,
      pais: (this.draftProfile.pais || '').trim(),
    };

    this.profileService.updatePlayerProfile(updateData).pipe(
      switchMap(() => this.authService.refreshToken()),
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: () => {
        const mergedProfile: Profile = {
          ...this.profile!,
          ...updateData
        };

        this.profile = mergedProfile;
        this.isEditing = false;
      },
      error: (err) => {
        console.error('Failed to update profile in API', err);
      }
    });
  }

  onNumericInput(event: any, field: 'height' | 'weight') {
    const finalValue = this.maskDecimalInput(event.target.value, field);

    if (field === 'height') {
      this.heightInput = finalValue;
    } else {
      this.weightInput = finalValue;
    }

    event.target.value = finalValue;
  }

  private maskDecimalInput(rawValue: string, field: 'height' | 'weight'): string {
    const cleaned = (rawValue || '').replace(/[^0-9.,]/g, '').replace(/,/g, '.');
    const firstDotIndex = cleaned.indexOf('.');
    const withSingleDot = firstDotIndex === -1
      ? cleaned
      : cleaned.slice(0, firstDotIndex + 1) + cleaned.slice(firstDotIndex + 1).replace(/\./g, '');

    const [integerPart, decimalPart] = withSingleDot.split('.');
    const maxIntegerDigits = field === 'height' ? 1 : 3;
    const limitedInteger = (integerPart || '').slice(0, maxIntegerDigits);

    if (decimalPart === undefined) {
      return limitedInteger;
    }

    return `${limitedInteger}.${decimalPart.slice(0, 2)}`;
  }

  private toNumberOrUndefined(value: string | null | undefined): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  onPlayerPositionSelectionChange(event: CustomEvent<{ value: string[] }>): void {
    this.draftPositions = event.detail.value ?? [];
  }

  async loadMoreUserPosts(event: any) {
    if (!this.userPostsHasMore || !this.profileId) {
      event.target.complete();
      event.target.disabled = true;
      return;
    }

    const load$ = this.isMyProfile
      ? this.postService.getPostsForAuthenticatedUser(this.DEFAULT_POST_LIMIT, this.userPostsCurrentCursor)
      : this.postService.getPostsByProfileId(this.profileId, this.DEFAULT_POST_LIMIT, this.userPostsCurrentCursor);

    load$.subscribe({
      next: response => {
        const newPosts = response.posts;
        this.userPostsSubject.next([...this.userPostsSubject.getValue(), ...newPosts]);
        this.userPostsCurrentCursor = response.nextCursor || undefined;
        this.userPostsHasMore = !!response.nextCursor && newPosts.length >= this.DEFAULT_POST_LIMIT;

        event.target.complete();
        if (!this.userPostsHasMore) {
          event.target.disabled = true;
        }
      },
      error: err => {
        console.error('Error loading more user posts', err);
        event.target.complete();
      }
    });
  }

  async refreshUserPosts(event: any) {
    this.resetAndLoadUserPosts();
    event.target.complete();
  }

  private resetAndLoadUserPosts() {
    this.userPostsSubject.next([]);
    this.userPostsCurrentCursor = undefined;
    this.userPostsHasMore = true;

    const infiniteScroll = document.querySelector('ion-infinite-scroll');
    if (infiniteScroll) {
      (infiniteScroll as any).disabled = false;
    }

    if (this.profileId && this.hasFullAccess) {
      const load$ = this.isMyProfile
        ? this.postService.getPostsForAuthenticatedUser(this.DEFAULT_POST_LIMIT, this.userPostsCurrentCursor)
        : this.postService.getPostsByProfileId(this.profileId, this.DEFAULT_POST_LIMIT, this.userPostsCurrentCursor);

      load$.subscribe({
        next: response => {
          this.userPostsSubject.next(response.posts);
          this.userPostsCurrentCursor = response.nextCursor || undefined;
          this.userPostsHasMore = !!response.nextCursor && response.posts.length >= this.DEFAULT_POST_LIMIT;

          if (!this.userPostsHasMore && infiniteScroll) {
            (infiniteScroll as any).disabled = true;
          }
        },
        error: err => {
          console.error('Error refreshing user posts', err);
        }
      });
    } else {
        this.userPostsHasMore = false;
        if (infiniteScroll) {
            (infiniteScroll as any).disabled = true;
        }
    }
  }


  getDisplayRole(role: Profile['role'] | undefined): string {
    if (role === 'CLUBE') {
      return 'OLHEIRO';
    }

    return role ?? '';
  }

  getDominantFootLabel(foot: string | undefined): string {
    const option = this.footOptions.find(o => o.value === foot);
    return option ? option.label : (foot ?? '');
  }

  getGenderLabel(gender: AthleteGender | string | null | undefined): string {
    const option = this.genderOptions.find(o => o.value === gender);
    return option ? option.label : (gender ?? '');
  }

  openVideo(post: Post) {
    this.selectedVideo = post;
    this.isVideoModalOpen = true;
  }

  onVideoLoaded(postId: string) {
    this.loadedVideos[postId] = true;
  }

  closeVideo() {
    this.isVideoModalOpen = false;
    this.selectedVideo = null;
  }

  async openVideoOptions(event: Event, post: Post) {
    event.stopPropagation();
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Opções do Vídeo',
      cssClass: 'be-action-sheet',
      buttons: [
        {
          text: 'Editar descrição',
          icon: createOutline,
          handler: () => {
            this.editVideoCaption(post);
          }
        },
        {
          text: 'Remover',
          role: 'destructive',
          icon: trashOutline,
          handler: () => {
            this.deleteVideo(post);
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

  async editVideoCaption(post: Post) {
    const alert = await this.alertCtrl.create({
      header: 'Editar descrição',
      cssClass: 'be-alert',
      inputs: [
        {
          name: 'caption',
          type: 'textarea',
          placeholder: 'Descrição do vídeo',
          value: post.caption
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Salvar',
          handler: (data) => {
            this.postService.updatePostCaption(post.id, data.caption).subscribe({
              next: () => {
                this.resetAndLoadUserPosts();
              },
              error: (err) => {
                console.error('Error updating caption', err);
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteVideo(post: Post) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar exclusão',
      message: 'Tem certeza que deseja remover este vídeo?',
      cssClass: 'be-alert-confirm',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Remover',
          role: 'destructive',
          handler: () => {
            this.postService.deletePost(post.id).subscribe({
              next: () => {
                this.resetAndLoadUserPosts();
                if (this.selectedVideo?.id === post.id) {
                  this.closeVideo();
                }
              },
              error: (err) => {
                console.error('Error deleting post', err);
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  private syncDraftProfile(): void {
    if (!this.profile) {
      this.draftProfile = {};
      this.draftPositions = [];
      this.heightInput = '';
      this.weightInput = '';
      return;
    }

    this.draftPositions = [...(this.profile.positions ?? [])];
    this.heightInput = this.profile.height != null ? this.profile.height.toFixed(2) : '';
    this.weightInput = this.profile.weight != null ? this.profile.weight.toFixed(2) : '';
    this.draftProfile = {
      fullName: this.profile.fullName,
      bio: this.profile.bio ?? '',
      positions: this.profile.positions ?? [],
      dominantFoot: this.profile.dominantFoot,
      gender: this.profile.gender ?? null,
      careerHistory: this.profile.careerHistory ?? '',
      cidade: this.profile.cidade ?? '',
      estado: this.profile.estado ?? '',
      pais: this.profile.pais ?? '',
    };
  }
}
