import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonTextarea,
  IonDatetime,
  IonDatetimeButton,
  IonModal,
  IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personCircleOutline, shieldCheckmarkOutline, calendarOutline, cameraOutline } from 'ionicons/icons';
import { AuthService, JwtPayload } from '../services/auth.service';
import { FileType, ProfileService } from '../services/profile.service';
import { Router } from '@angular/router';
import { catchError, finalize, switchMap, tap } from 'rxjs/operators';
import { EMPTY, of } from 'rxjs';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { HttpEvent, HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-create-profile',
  templateUrl: './create-profile.page.html',
  styleUrls: ['./create-profile.page.scss'],
  standalone: true,
  imports: [
    IonContent, CommonModule, FormsModule, ReactiveFormsModule,
    IonItem, IonInput, IonButton, IonIcon, IonLabel, IonSegment, IonSegmentButton, IonTextarea,
    IonDatetime, IonDatetimeButton, IonModal, IonSpinner
  ]
})
export class CreateProfilePage implements OnInit {
  profileForm!: FormGroup;
  userRole: string | null = null;
  isRoleFromToken = false;
  isLoading = false;

  profileImageUrl: string | null = null;
  private selectedImageFile: File | null = null;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);
  private toastController = inject(ToastController);

  constructor() {
    addIcons({ personCircleOutline, shieldCheckmarkOutline, calendarOutline, cameraOutline });
  }

  ngOnInit() {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    if (decodedToken && decodedToken.role) {
      this.userRole = decodedToken.role;
      this.isRoleFromToken = true;
    }

    this.profileForm = this.fb.group({
      bio: ['', [Validators.maxLength(500)]],
      position: ['', [Validators.maxLength(100)]],
      height: ['', [Validators.maxLength(20)]],
      weight: ['', [Validators.maxLength(20)]],
      careerHistory: ['', [Validators.maxLength(1000)]],
      documentNumber: ['', [Validators.required]],
      phoneNumber: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(15)]],
      dateOfBirth: [null, [Validators.required]],
      role: [this.userRole || 'JOGADOR', [Validators.required]]
    });

    if (this.isRoleFromToken) {
      this.profileForm.get('role')?.disable();
    }
  }

  async selectProfileImage() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true, // Simple crop/zoom
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });

      if (image.webPath) {
        this.profileImageUrl = image.webPath;
        // Convert URI to Blob and then to File
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
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formValue = this.profileForm.getRawValue();
    const formattedDate = this.formatDate(formValue.dateOfBirth);
    const requestData = { ...formValue, dateOfBirth: formattedDate };

    this.profileService.createPlayerProfile(requestData).pipe(
      switchMap(() => {
        if (this.selectedImageFile) {
          return this.handleImageUpload(this.selectedImageFile).pipe(
            catchError(uploadErr => {
              console.error('Image upload failed, but profile was created.', uploadErr);
              this.showToast('Perfil salvo, mas o upload da imagem falhou.', 'danger');
              return of(null);
            })
          );
        }
        return of(null);
      }),
      tap(() => {
        this.authService.getCurrentUser().subscribe(() => {
          this.router.navigate(['/home']);
        });
      }),
      finalize(() => this.isLoading = false),
      catchError(err => {
        console.error('An error occurred in the profile creation flow', err);
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
          tap(event => {
            if (event.type === HttpEventType.Response) {
              if (event.status !== 200) {
                throw new Error('S3 upload failed');
              }
            }
          }),
          switchMap(event => event.type === HttpEventType.Response ? of(true) : EMPTY)
        );
      }),
      switchMap(() => {
        // Step 3: Notify backend
        return this.profileService.notifyUploadComplete();
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

  private async showToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'top'
    });
    toast.present();
  }
}
