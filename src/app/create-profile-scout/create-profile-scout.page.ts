import { CommonModule, Location } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import {take, switchMap, catchError, finalize, first} from 'rxjs/operators';
import { of } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  cameraOutline,
  cloudUploadOutline,
  checkmarkCircleOutline,
  personCircleOutline,
  linkOutline,
  idCardOutline,
  calendarOutline
} from 'ionicons/icons';
import {
  BR_STATE_OPTIONS,
  SCOUT_AGE_CATEGORIES,
  SCOUT_MODALITY_OPTIONS,
  SCOUT_POSITION_OPTIONS,
  SCOUT_TYPE_OPTIONS,
  ScoutAgeCategory,
  ScoutPosition,
  ScoutProfile,
  ScoutTypeOption
} from '../models/scout-profile.model';
import { AuthService, User } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';
import { FileType } from '../models/upload.model';
import { ProfileScoutCreationRequest } from '../models/profile.model';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

function arrayRequiredValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    return Array.isArray(value) && value.length > 0 ? null : { requiredArray: true };
  };
}

function requiredTrueValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    return control.value === true ? null : { requiredTrue: true };
  };
}

function optionalUrlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '').toString().trim();
    if (!value) {
      return null;
    }

    return (/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(value) || value.startsWith('data:image/'))
      ? null
      : { invalidUrl: true };
  };
}

@Component({
  selector: 'app-create-profile-scout',
  templateUrl: './create-profile-scout.page.html',
  styleUrls: ['./create-profile-scout.page.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule]
})
export class CreateProfileScoutPage implements OnInit {
  @ViewChild('photoInput') photoInput?: ElementRef<HTMLInputElement>;

  profileForm: FormGroup;
  saveAttempted = false;
  isSaving = false;
  phoneDisplayValue = '';
  cpfDisplayValue = '';
  private selectedImageFile: File | null = null;

  readonly typeOptions = SCOUT_TYPE_OPTIONS;
  readonly modalityOptions = SCOUT_MODALITY_OPTIONS;
  readonly ageCategoryOptions = SCOUT_AGE_CATEGORIES;
  readonly positionOptions = SCOUT_POSITION_OPTIONS;
  readonly stateOptions = BR_STATE_OPTIONS;

  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  profileImageUrl: string | null = null;

  constructor() {
    addIcons({
      arrowBackOutline,
      cameraOutline,
      cloudUploadOutline,
      checkmarkCircleOutline,
      personCircleOutline,
      linkOutline,
      idCardOutline,
      calendarOutline
    });

    this.profileForm = this.fb.group({
      documentNumber: ['', [Validators.required, Validators.minLength(11)]],
      fotoPerfilUrl: ['', [optionalUrlValidator()]],
      tipoOlheiro: ['', [Validators.required]],
      tipoOlheiroOutroTexto: [''],
      organizacaoOuClube: [''],
      cargoOuFuncao: [''],
      dateOfBirth: [null, [Validators.required]],
      telefoneWhatsapp: ['', [Validators.required, Validators.minLength(10)]],
      cidade: ['', [Validators.required]],
      estado: ['', [Validators.required]],
      pais: ['Brasil', [Validators.required]],
      modalidade: ['', [Validators.required]],
      categoriasIdadeAlvo: [[], [arrayRequiredValidator()]],
      posicoesInteresse: [[], [arrayRequiredValidator()]],
      regiaoAtuacaoTexto: ['', [Validators.required, Validators.minLength(3)]],
      documentoVerificado: [false],
      documentoUploadId: [''],
      linkReferencia: ['', [optionalUrlValidator()]],
      aceitouTermos: [false, [requiredTrueValidator()]],
      bio: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      oQueBuscaNoBeSeen: ['', [Validators.maxLength(300)]]
    });
  }

  async ngOnInit(): Promise<void> {
    this.profileForm.reset({
      pais: 'Brasil',
      documentoVerificado: false,
      aceitouTermos: false,
      categoriasIdadeAlvo: [],
      posicoesInteresse: []
    });
    this.profileImageUrl = null;
    this.selectedImageFile = null;
    this.cpfDisplayValue = '';
    this.phoneDisplayValue = '';
  }

  get isTipoOutroSelected(): boolean {
    return this.profileForm.get('tipoOlheiro')?.value === 'Outro';
  }

  get bioLength(): number {
    return this.getControlValueLength('bio');
  }

  get oQueBuscaLength(): number {
    return this.getControlValueLength('oQueBuscaNoBeSeen');
  }

  get selectedCategorias(): ScoutAgeCategory[] {
    return (this.profileForm.get('categoriasIdadeAlvo')?.value ?? []) as ScoutAgeCategory[];
  }

  get selectedPosicoes(): ScoutPosition[] {
    return (this.profileForm.get('posicoesInteresse')?.value ?? []) as ScoutPosition[];
  }

  onlyDigits(input: string): string {
    return (input ?? '').replace(/\D+/g, '');
  }

  formatPhoneBR(digits: string): string {
    const cleaned = this.onlyDigits(digits).slice(0, 11);
    if (cleaned.length <= 2) return cleaned ? `(${cleaned}` : '';
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (cleaned.length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }

  formatCPF(digits: string): string {
    const cleaned = this.onlyDigits(digits).slice(0, 11);
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }

  onPhoneInput(event: any): void {
    const rawValue = event.target.value || '';
    const digits = this.onlyDigits(rawValue).slice(0, 11);

    this.phoneDisplayValue = this.formatPhoneBR(digits);
    this.profileForm.get('telefoneWhatsapp')?.setValue(digits, { emitEvent: false });
    event.target.value = this.phoneDisplayValue;
  }

  onCPFInput(event: any): void {
    const rawValue = event.target.value || '';
    const digits = this.onlyDigits(rawValue).slice(0, 11);

    this.cpfDisplayValue = this.formatCPF(digits);
    this.profileForm.get('documentNumber')?.setValue(digits, { emitEvent: false });
    event.target.value = this.cpfDisplayValue;
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

  async showDocumentUploadInfo(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Enviar documento',
      message: 'O upload de documentos estara disponivel na V2. Neste MVP, a verificacao permanece pendente.',
      buttons: ['Fechar']
    });

    await alert.present();
  }

  private handleImageUpload(file: File) {
    const uploadRequest = {
      fileName: file.name,
      contentType: file.type,
      category: FileType.PROFILE_IMAGE,
      size: file.size
    };

    return this.profileService.getPresignedUrl(uploadRequest).pipe(
      first(),
      switchMap(uploadResponse => {
        return this.profileService.uploadImageToS3(uploadResponse.uploadUrl, file, file.type).pipe(
          first(),
          catchError(uploadErr => {
            console.error('Image upload failed, but profile was created.', uploadErr);
            this.showToast('Perfil salvo, mas o upload da imagem falhou.', 'warning');
            return of(null);
          })
        );
      }),
      switchMap(() => {
        return this.profileService.notifyUploadComplete().pipe(
           first(),
           catchError(notifyErr => {
            console.error('Notifying backend failed.', notifyErr);
            return of(null);
          })
        );
      })
    );
  }

  async saveProfile(): Promise<void> {
    this.saveAttempted = true;

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;

    try {
      const formValue = this.profileForm.getRawValue();
      const formattedDate = this.formatDate(formValue.dateOfBirth);
      const profile: ProfileScoutCreationRequest = {
        role: 'CLUBE',
        documentNumber: formValue.documentNumber.trim(),
        dateOfBirth: formattedDate,
        fotoPerfilUrl: this.normalizeOptionalValue(formValue.fotoPerfilUrl),
        tipoOlheiro: formValue.tipoOlheiro as ScoutTypeOption,
        tipoOlheiroOutroTexto: this.normalizeOptionalValue(formValue.tipoOlheiroOutroTexto),
        organizacaoOuClube: this.normalizeOptionalValue(formValue.organizacaoOuClube),
        cargoOuFuncao: this.normalizeOptionalValue(formValue.cargoOuFuncao),
        telefoneWhatsapp: this.onlyDigits(formValue.telefoneWhatsapp),
        cidade: formValue.cidade.trim(),
        estado: formValue.estado,
        pais: formValue.pais.trim(),
        modalidade: formValue.modalidade,
        categoriasIdadeAlvo: formValue.categoriasIdadeAlvo,
        posicoesInteresse: formValue.posicoesInteresse,
        regiaoAtuacaoTexto: formValue.regiaoAtuacaoTexto.trim(),
        documentoVerificado: !!formValue.documentoVerificado,
        documentoUploadId: this.normalizeOptionalValue(formValue.documentoUploadId),
        linkReferencia: this.normalizeOptionalValue(formValue.linkReferencia),
        aceitouTermos: !!formValue.aceitouTermos,
        bio: formValue.bio.trim(),
        oQueBuscaNoBeSeen: this.normalizeOptionalValue(formValue.oQueBuscaNoBeSeen)
      };

      if (!this.selectedImageFile) {
        this.showToast('Por favor, adicione uma imagem de perfil.', 'danger');
        this.isSaving = false;
        return;
      }

      this.profileService.createScoutProfile(profile).pipe(
        switchMap(() => this.handleImageUpload(this.selectedImageFile!)),
        finalize(() => this.isSaving = false),
        catchError(err => {
          console.error('Erro ao criar o perfil de olheiro', err);
          this.showToast('Erro ao salvar o perfil.', 'danger');
          throw err;
        })
      ).subscribe({
        next: async () => {
          const toast = await this.toastController.create({
            message: 'Perfil criado com sucesso! Por favor, faça login novamente para acessar sua conta.',
            duration: 1000,
            color: 'success',
            position: 'top'
          });

          await toast.present();

          this.authService.logout();
          this.router.navigate(['/login']);
        }
      });
    } catch (error) {
      console.error('Error preparing scout profile save', error);
      this.isSaving = false;
    }
  }

  hasError(controlName: string, errorKey?: string): boolean {
    const control = this.profileForm.get(controlName);
    if (!control) {
      return false;
    }

    const shouldShow = control.touched || this.saveAttempted;
    if (!shouldShow) {
      return false;
    }

    return errorKey ? !!control.errors?.[errorKey] : control.invalid;
  }

  goBack(): void {
    this.location.back();
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

  private normalizeOptionalValue(value: string | null | undefined): string | null {
    const trimmedValue = (value ?? '').trim();
    return trimmedValue ? trimmedValue : null;
  }

  private getControlValueLength(controlName: string): number {
    return ((this.profileForm.get(controlName)?.value ?? '') as string).length;
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
