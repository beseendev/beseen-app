import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonLabel,
  IonTextarea,
  IonDatetime,
  IonDatetimeButton,
  IonModal,
  IonSpinner,
  ToastController,
  IonSegment,
  IonSegmentButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personCircleOutline, shieldCheckmarkOutline, calendarOutline, cameraOutline } from 'ionicons/icons';
import { AuthService, JwtPayload } from '../services/auth.service';
import { FileType, ProfileService } from '../services/profile.service';
import { Router } from '@angular/router';
import { catchError, finalize, switchMap, tap } from 'rxjs/operators';
import { EMPTY, of, Subscription } from 'rxjs';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ProfilePlayerCreationRequest, ProfileScoutCreationRequest } from '../models/profile.model';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-create-profile',
  templateUrl: './create-profile.page.html',
  styleUrls: ['./create-profile.page.scss'],
  standalone: true,
  imports: [
    IonContent, CommonModule, FormsModule, ReactiveFormsModule,
    IonItem, IonInput, IonButton, IonIcon, IonLabel, IonTextarea,
    IonDatetime, IonDatetimeButton, IonModal, IonSpinner, IonSegment, IonSegmentButton
  ]
})
export class CreateProfilePage implements OnInit, OnDestroy {
  profileForm!: FormGroup;
  isRoleFromToken = false;
  isLoading = false;

  profileImageUrl: string | null = null;
  private selectedImageFile: File | null = null;
  private roleChangesSub!: Subscription;

  idToken: string | null = null;
  loginMethod: string | null = null;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private route = inject(ActivatedRoute);

  constructor() {
    addIcons({ personCircleOutline, shieldCheckmarkOutline, calendarOutline, cameraOutline });
  }

  ngOnInit() {
    this.initializeForm();
    this.listenToRoleChanges();

    this.route.queryParams.subscribe(params => {
      this.idToken = params['idToken'] || null;
      this.loginMethod = params['loginMethod'] || null;
    });
  }

  ngOnDestroy() {
    if (this.roleChangesSub) {
      this.roleChangesSub.unsubscribe();
    }
  }

  private initializeForm(): void {
    let roleFromToken: string | null = null;
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    if (decodedToken && decodedToken.role) {
      roleFromToken = decodedToken.role;
      this.isRoleFromToken = true;
    }

    this.profileForm = this.fb.group({
      documentNumber: ['', [Validators.required]],
      phoneNumber: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(15)]],
      dateOfBirth: [null, [Validators.required]],
      role: [roleFromToken, [Validators.required]]
    });

    if (this.isRoleFromToken) {
      this.profileForm.get('role')?.disable();
      this.updateFormFields(roleFromToken);
    }
  }

  private listenToRoleChanges(): void {
    this.roleChangesSub = this.profileForm.get('role')!.valueChanges.subscribe(role => {
      this.updateFormFields(role);
    });
  }

  private updateFormFields(role: string | null): void {
    // Remove all specific controls first
    this.profileForm.removeControl('bio');
    this.profileForm.removeControl('position');
    this.profileForm.removeControl('height');
    this.profileForm.removeControl('weight');
    this.profileForm.removeControl('careerHistory');
    this.profileForm.removeControl('clubName');
    this.profileForm.removeControl('areaOfExpertise');

    if (role === 'JOGADOR') {
      this.profileForm.addControl('bio', this.fb.control('', [Validators.maxLength(500)]));
      this.profileForm.addControl('position', this.fb.control('', [Validators.maxLength(100)]));
      this.profileForm.addControl('height', this.fb.control('', [Validators.maxLength(20)]));
      this.profileForm.addControl('weight', this.fb.control('', [Validators.maxLength(20)]));
      this.profileForm.addControl('careerHistory', this.fb.control('', [Validators.maxLength(1000)]));
    } else if (role === 'CLUBE') {
      this.profileForm.addControl('bio', this.fb.control('', [Validators.maxLength(500)]));
      this.profileForm.addControl('clubName', this.fb.control('', [Validators.maxLength(255)]));
      this.profileForm.addControl('areaOfExpertise', this.fb.control('', [Validators.maxLength(255)]));
    }
  }

  async selectProfileImage() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });

      if (image.webPath) {
        this.profileImageUrl = image.webPath;
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        this.selectedImageFile = new File([blob], `profile_${new Date().getTime()}.${image.format}`, { type: blob.type });
      }
    } catch (error) {
      console.error('Error selecting image', error);
      this.showToast('Não foi possível selecionar a imagem.', 'danger');
    }
  }

  submitForm() {
    if (!this.selectedImageFile) {
      this.showToast('Por favor, adicione uma imagem de perfil.', 'danger');
      return;
    }

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.showToast('Por favor, preencha todos os campos obrigatórios.', 'danger');
      return;
    }

    this.isLoading = true;
    const formValue = this.profileForm.getRawValue();
    const formattedDate = this.formatDate(formValue.dateOfBirth);
    const requestData = { ...formValue, dateOfBirth: formattedDate };

    const profileCreation$ = formValue.role === 'JOGADOR'
      ? this.profileService.createPlayerProfile(requestData as ProfilePlayerCreationRequest)
      : this.profileService.createScoutProfile(requestData as ProfileScoutCreationRequest);

    profileCreation$.pipe(
      switchMap(() => this.handleImageUpload(this.selectedImageFile!)),
      switchMap(() => this.authService.refreshCurrentUser()),
      switchMap(() => {
        if (this.loginMethod === 'instagram' && this.idToken) {
          return this.authService.loginWithFirebaseToken(this.idToken);
        } else {
          return of(null);
        }
      }),
      tap(() => {
        this.router.navigate(['/home']);
      }),
      finalize(() => this.isLoading = false),
      catchError(err => {
        console.error('An error occurred in the profile creation flow', err);
        this.showToast('Erro ao criar o perfil ou fazer login novamente.', 'danger');
        return EMPTY;
      })
    ).subscribe();
  }

 private handleImageUpload(file: File) {
    const uploadRequest = {
      fileName: file.name,
      contentType: file.type,
      category: FileType.PROFILE_IMAGE,
      size: file.size
    };

    return this.profileService.getPresignedUrl(uploadRequest).pipe(
      switchMap(uploadResponse => {
        return this.profileService.uploadImageToS3(uploadResponse.uploadUrl, file, file.type).pipe(
          catchError(uploadErr => {
            console.error('Image upload failed, but profile was created.', uploadErr);
            this.showToast('Perfil salvo, mas o upload da imagem falhou. Tente novamente em seu perfil.', 'warning');
            return of(null);
          })
        );
      }),
      switchMap(() => {
        return this.profileService.notifyUploadComplete().pipe(
           catchError(notifyErr => {
            console.error('Notifying backend failed.', notifyErr);
            this.showToast('Não foi possível finalizar o upload da imagem.', 'danger');
            return of(null);
          })
        );
      })
    );
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'top'
    });
    toast.present();
  }
}
