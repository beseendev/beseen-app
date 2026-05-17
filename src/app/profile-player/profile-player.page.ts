import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonContent, IonAvatar, IonLabel, IonGrid, IonRow, IonCol, IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonList, IonText, IonSegment, IonSegmentButton, IonInput, IonTextarea, IonSelect, IonSelectOption, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, createOutline, personCircleOutline, briefcaseOutline, calendarOutline, bodyOutline, resizeOutline, scaleOutline, informationCircleOutline, timeOutline, videocamOutline, checkmarkOutline, closeOutline, locationOutline, mapOutline, globeOutline, lockClosedOutline, imageOutline } from 'ionicons/icons';
import { ActivatedRoute, Router } from '@angular/router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ProfileService } from '../services/profile.service';
import { PostService } from '../services/post.service';
import { Profile } from '../models/profile.model';
import { Post } from '../models/post.model';
import { FileType } from '../models/upload.model';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { switchMap, tap, map, filter, finalize } from 'rxjs/operators';
import { PostCardComponent } from '../components/post-card/post-card.component';
import {AuthService, JwtPayload} from '../services/auth.service';
import { SCOUT_POSITION_OPTIONS, BR_STATE_OPTIONS } from '../models/scout-profile.model';
import { environment } from '../../environments/environment';
import {SubscriptionService} from "../services/subscription.service";

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
    IonItem,
    IonList,
    IonText,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonSpinner
  ],
})
export class ProfilePlayerPage implements OnInit {
  profileId: string | null = null;
  profile: Profile | null = null;
  isMyProfile = false;
  isEditing = false;
  isUploadingPhoto = false;
  selectedSegment: 'images' | 'videos' = 'images';
  draftProfile: Partial<Profile> = {};
  isLoading = false;
  private readonly DEFAULT_POST_LIMIT = 10;
  readonly positionOptions = SCOUT_POSITION_OPTIONS;
  readonly stateOptions = BR_STATE_OPTIONS;
  readonly footOptions = [
    { label: 'Destro', value: 'RIGHT' },
    { label: 'Canhoto', value: 'LEFT' },
    { label: 'Ambidestro', value: 'BOTH' }
  ];

  private profileService = inject(ProfileService);
  private postService = inject(PostService);
  private authService = inject(AuthService);
  public subscriptionService = inject(SubscriptionService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  private userPostsSubject = new BehaviorSubject<Post[]>([]);
  private selectedSegmentSubject = new BehaviorSubject<'images' | 'videos'>('images');
  filteredUserPosts$: Observable<Post[]>;
  private userPostsCurrentCursor: string | undefined;
  private userPostsHasMore = true;

  get hasFullAccess(): boolean {
    return this.isMyProfile || this.subscriptionService.hasFullProfileAccess();
  }

  constructor() {
    addIcons({ arrowBackOutline, createOutline, personCircleOutline, briefcaseOutline, calendarOutline, bodyOutline, resizeOutline, scaleOutline, informationCircleOutline, timeOutline, videocamOutline, checkmarkOutline, closeOutline, locationOutline, mapOutline, globeOutline, lockClosedOutline, imageOutline });

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

  segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
    this.selectedSegmentSubject.next(this.selectedSegment);
  }

  openSupport() {
    this.router.navigate(['/suporte']);
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
      position: (this.draftProfile.position || '').trim(),
      height: (this.draftProfile.height || '').trim(),
      weight: (this.draftProfile.weight || '').trim(),
      dominantFoot: this.draftProfile.dominantFoot,
      careerHistory: (this.draftProfile.careerHistory || '').trim(),
      cidade: (this.draftProfile.cidade || '').trim(),
      estado: this.draftProfile.estado,
      pais: (this.draftProfile.pais || '').trim(),
    };

    this.profileService.updatePlayerProfile(updateData).pipe(
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

  followUser() {
    console.log('Follow user', this.profile?.name);
  }

  startChat() {
    console.log('Start chat with', this.profile?.name);
  }

  onNumericInput(event: any, field: 'height' | 'weight') {
    const rawValue = event.target.value || '';
    const cleaned = rawValue.replace(/[^0-9.,]/g, '').replace(/,/g, '.');
    const parts = cleaned.split('.');
    const finalValue = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;

    this.draftProfile[field] = finalValue;
    event.target.value = finalValue;
  }

  async loadMoreUserPosts(event: any) {
    if (!this.userPostsHasMore || !this.profileId) {
      event.target.complete();
      event.target.disabled = true;
      return;
    }

    // TODO: Se não for meu perfil, precisamos de um endpoint para buscar posts de outro usuário
    // Por enquanto, apenas o dono do perfil consegue ver seus posts reais via API
    if (!this.isMyProfile) {
        event.target.complete();
        event.target.disabled = true;
        return;
    }

    this.postService.getPostsForAuthenticatedUser(this.DEFAULT_POST_LIMIT, this.userPostsCurrentCursor).subscribe({
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

    // Reset infinite scroll if possible
    const infiniteScroll = document.querySelector('ion-infinite-scroll');
    if (infiniteScroll) {
      (infiniteScroll as any).disabled = false;
    }

    if (this.profileId && this.isMyProfile) {
      this.postService.getPostsForAuthenticatedUser(this.DEFAULT_POST_LIMIT, this.userPostsCurrentCursor).subscribe({
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
        // Se não for meu perfil, desabilita carregamento por enquanto (necessário endpoint público)
        this.userPostsHasMore = false;
        if (infiniteScroll) {
            (infiniteScroll as any).disabled = true;
        }
    }
  }

  trackById(index: number, post: Post): string {
    return post.id;
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

  private syncDraftProfile(): void {
    if (!this.profile) {
      this.draftProfile = {};
      return;
    }

    this.draftProfile = {
      fullName: this.profile.fullName,
      bio: this.profile.bio ?? '',
      position: this.profile.position ?? '',
      height: this.profile.height ?? '',
      weight: this.profile.weight ?? '',
      dominantFoot: this.profile.dominantFoot,
      careerHistory: this.profile.careerHistory ?? '',
      cidade: this.profile.cidade ?? '',
      estado: this.profile.estado ?? '',
      pais: this.profile.pais ?? '',
    };
  }
}

