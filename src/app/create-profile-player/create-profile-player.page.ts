import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
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
  IonSelect,
  IonSelectOption,
  ToastController,
  IonSegment,
  IonSegmentButton,
  IonList,
  IonNote
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personCircleOutline, shieldCheckmarkOutline, calendarOutline, cameraOutline, arrowBackOutline, resizeOutline, barbellOutline, listOutline, documentTextOutline, idCardOutline, callOutline, bodyOutline, locationOutline, mapOutline, globeOutline } from 'ionicons/icons';
import { AuthService, JwtPayload } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';
import { FileType } from '../models/upload.model';
import { Router } from '@angular/router';
import { catchError, finalize, switchMap, tap, filter } from 'rxjs/operators';
import { EMPTY, of, Subscription } from 'rxjs';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AthleteGender, ProfilePlayerCreationRequest } from '../models/profile.model';
import { ActivatedRoute } from '@angular/router';
import { SCOUT_POSITION_OPTIONS, BR_STATE_OPTIONS } from '../models/scout-profile.model';

@Component({
  selector: 'app-create-profile-player',
  templateUrl: './create-profile-player.page.html',
  styleUrls: ['./create-profile-player.page.scss'],
  standalone: true,
  imports: [
    IonContent, CommonModule, FormsModule, ReactiveFormsModule,
    IonItem, IonInput, IonButton, IonIcon, IonTextarea,
    IonDatetime, IonModal, IonSpinner,
    IonSelect, IonSelectOption,
    IonNote
  ]
})
export class CreateProfilePlayerPage implements OnInit, OnDestroy {
  profileForm!: FormGroup;
  isRoleFromToken = false;
  isLoading = false;

  profileImageUrl: string | null = null;
  private selectedImageFile: File | null = null;
  private roleChangesSub!: Subscription;

  idToken: string | null = null;
  loginMethod: string | null = null;

  phoneDisplayValue = '';
  cpfDisplayValue = '';
  dateOfBirthDisplayValue = '';

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

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private route = inject(ActivatedRoute);
  private location = inject(Location);

  constructor() {
    addIcons({ personCircleOutline, shieldCheckmarkOutline, calendarOutline, cameraOutline, arrowBackOutline, resizeOutline, barbellOutline, listOutline, documentTextOutline, idCardOutline, callOutline, bodyOutline, locationOutline, mapOutline, globeOutline });
  }

  ngOnInit() {
    this.phoneDisplayValue = '';
    this.cpfDisplayValue = '';
    this.dateOfBirthDisplayValue = '';
    this.profileImageUrl = null;
    this.selectedImageFile = null;

    const shouldContinue = this.initializeForm();
    if (!shouldContinue) {
      return;
    }

    this.listenToRoleChanges();

    this.route.queryParams.subscribe(params => {
      this.idToken = params['idToken'] || null;
      this.loginMethod = params['loginMethod'] || null;
      const role = params['role'] || null;
      if (role && this.profileForm) {
        this.profileForm.get('role')?.setValue(role);
      }
    });
  }

  ngOnDestroy() {
    if (this.roleChangesSub) {
      this.roleChangesSub.unsubscribe();
    }
  }

  private initializeForm(): boolean {
    let roleFromToken: string | null = null;
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    if (decodedToken && decodedToken.role) {
      roleFromToken = decodedToken.role;
      this.isRoleFromToken = true;
    }

    const roleFromParams = this.route.snapshot.queryParams['role'];
    const finalRole = roleFromToken || roleFromParams || null;

    if (finalRole === 'CLUBE' && !this.router.url.includes('create-profile-scout')) {
      this.router.navigate(['/create-profile-scout'], { queryParams: this.route.snapshot.queryParams });
      return false;
    }

    this.profileForm = this.fb.group({
      documentNumber: ['', [Validators.required, Validators.minLength(11)]],
      phoneNumber: ['', [Validators.required, Validators.minLength(10)]],
      dateOfBirth: [null, [Validators.required]],
      cidade: ['', [Validators.required]],
      estado: ['', [Validators.required]],
      pais: ['Brasil', [Validators.required]],
      role: [finalRole, [Validators.required]]
    });

    if (finalRole) {
      this.updateFormFields(finalRole);
    }

    if (this.isRoleFromToken) {
      this.profileForm.get('role')?.disable();
    }

    return true;
  }

  private listenToRoleChanges(): void {
    this.roleChangesSub = this.profileForm.get('role')!.valueChanges.subscribe(role => {
      if (role === 'CLUBE') {
        this.router.navigate(['/create-profile-scout'], { queryParams: this.route.snapshot.queryParams });
        return;
      }

      this.updateFormFields(role);
    });
  }

  private updateFormFields(role: string | null): void {
    if (role === 'JOGADOR') {
      this.profileForm.addControl('bio', this.fb.control('', [Validators.maxLength(500)]));
      this.profileForm.addControl('position', this.fb.control<string[]>([], [Validators.required]));
      this.profileForm.addControl('height', this.fb.control('', [Validators.required]));
      this.profileForm.addControl('weight', this.fb.control('', [Validators.required]));
      this.profileForm.addControl('dominantFoot', this.fb.control('', [Validators.required]));
      this.profileForm.addControl('gender', this.fb.control<AthleteGender | null>(null));
      this.profileForm.addControl('careerHistory', this.fb.control('', [Validators.maxLength(1000)]));
    }
  }

  onPhoneInput(event: any) {
    const rawValue = event.target.value || '';
    const digits = this.onlyDigits(rawValue).slice(0, 11);
    this.phoneDisplayValue = this.formatPhoneBR(digits);
    this.profileForm.get('phoneNumber')?.setValue(digits, { emitEvent: false });
  }

  onCPFInput(event: any) {
    const rawValue = event.target.value || '';
    const digits = this.onlyDigits(rawValue).slice(0, 11);
    this.cpfDisplayValue = this.formatCPF(digits);
    this.profileForm.get('documentNumber')?.setValue(digits, { emitEvent: false });
  }

  onDateInput(event: any): void {
    const rawValue = event.target.value || '';
    const digits = rawValue.replace(/\D/g, '').slice(0, 8);

    let formatted = '';
    if (digits.length <= 2) {
      formatted = digits;
    } else if (digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    }

    this.dateOfBirthDisplayValue = formatted;
    event.target.value = formatted;

    if (digits.length === 8) {
      const day = digits.slice(0, 2);
      const month = digits.slice(2, 4);
      const year = digits.slice(4);
      const isoDate = `${year}-${month}-${day}`;
      this.profileForm.get('dateOfBirth')?.setValue(isoDate, { emitEvent: false });
    } else {
      this.profileForm.get('dateOfBirth')?.setValue(null, { emitEvent: false });
    }
  }

  onDateSelected(event: any): void {
    const isoDate = event.detail.value;
    if (isoDate) {
      const datePart = isoDate.split('T')[0];
      this.profileForm.get('dateOfBirth')?.setValue(datePart, { emitEvent: false });
      const [year, month, day] = datePart.split('-');
      this.dateOfBirthDisplayValue = `${day}/${month}/${year}`;
    }
  }

  onNumericInput(event: any, controlName: string) {
    const rawValue = event.target.value || '';
    const cleaned = rawValue.replace(/[^0-9.,]/g, '').replace(/,/g, '.');
    const parts = cleaned.split('.');
    const finalValue = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;

    this.profileForm.get(controlName)?.setValue(finalValue, { emitEvent: false });
    event.target.value = finalValue;
  }

  private onlyDigits(input: string): string {
    return (input ?? '').replace(/\D+/g, '');
  }

  private formatPhoneBR(digits: string): string {
    if (digits.length <= 2) return digits ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  private formatCPF(digits: string): string {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  goBack(): void {
    this.location.back();
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
      this.showToast('Por favor, preencha todos os campos obrigatórios corretamente.', 'danger');
      return;
    }

    this.isLoading = true;
    const formValue = this.profileForm.getRawValue();
    const formattedDate = this.formatDate(formValue.dateOfBirth);
    const { position, ...restFormValue } = formValue;
    const requestData = {
      ...restFormValue,
      positions: Array.isArray(position) ? position : [],
      dateOfBirth: formattedDate,
      cidade: formValue.cidade?.trim(),
      pais: formValue.pais?.trim()
    };
    const profileCreation$ = this.profileService.createPlayerProfile(requestData as ProfilePlayerCreationRequest);

    profileCreation$.pipe(
      switchMap(() => this.handleImageUpload(this.selectedImageFile!)),
      switchMap(() => this.authService.refreshToken()),
      switchMap(() => this.authService.refreshCurrentUser()),
      switchMap(() => {
        if (this.loginMethod === 'instagram' && this.idToken) {
          return this.authService.loginWithFirebaseToken(this.idToken);
        } else {
          return of(null);
        }
      }),
      tap(() => {
        this.router.navigate(['/player-home']);
      }),
      finalize(() => this.isLoading = false),
      catchError(err => {
        this.showToast('Erro ao criar o perfil.', 'danger');
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
          filter((event: any) => event.type === 4), // HttpEventType.Response
          catchError(uploadErr => {
            this.showToast('Perfil salvo, mas o upload da imagem falhou.', 'warning');
            return of(null);
          })
        );
      }),
      switchMap((s3Response) => {
        if (!s3Response) return of(null);
        return this.profileService.notifyUploadComplete().pipe(
           catchError(notifyErr => {
            console.error('Notifying backend failed.', notifyErr);
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
