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
import { take } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  cameraOutline,
  cloudUploadOutline,
  checkmarkCircleOutline,
  personCircleOutline,
  linkOutline
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
import { ScoutProfileService } from '../services/scout-profile.service';
import { AuthService, User } from '../services/auth.service';

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
  selector: 'app-scout-profile',
  templateUrl: './scout-profile.page.html',
  styleUrls: ['./scout-profile.page.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule]
})
export class ScoutProfilePage implements OnInit {
  @ViewChild('photoInput') photoInput?: ElementRef<HTMLInputElement>;

  profileForm: FormGroup;
  saveAttempted = false;
  isSaving = false;
  phoneDisplayValue = '';

  readonly typeOptions = SCOUT_TYPE_OPTIONS;
  readonly modalityOptions = SCOUT_MODALITY_OPTIONS;
  readonly ageCategoryOptions = SCOUT_AGE_CATEGORIES;
  readonly positionOptions = SCOUT_POSITION_OPTIONS;
  readonly stateOptions = BR_STATE_OPTIONS;

  private readonly fb = inject(FormBuilder);
  private readonly scoutProfileService = inject(ScoutProfileService);
  private readonly authService = inject(AuthService);
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  constructor() {
    addIcons({
      arrowBackOutline,
      cameraOutline,
      cloudUploadOutline,
      checkmarkCircleOutline,
      personCircleOutline,
      linkOutline
    });

    this.profileForm = this.fb.group({
      nomeCompleto: ['', [Validators.required, Validators.minLength(3)]],
      fotoPerfilUrl: ['', [optionalUrlValidator()]],
      tipoOlheiro: ['', [Validators.required]],
      tipoOlheiroOutroTexto: [''],
      organizacaoOuClube: [''],
      cargoOuFuncao: [''],
      email: ['', [Validators.required, Validators.email]],
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
      sobreMim: ['', [Validators.required, Validators.minLength(300), Validators.maxLength(500)]],
      oQueBuscaNoBeSeen: ['', [Validators.maxLength(300)]]
    });
  }

  async ngOnInit(): Promise<void> {
    this.setupConditionalValidation();

    const savedProfile = await this.scoutProfileService.getProfile();
    if (savedProfile) {
      this.profileForm.patchValue(savedProfile);
      this.phoneDisplayValue = this.formatPhoneBR(savedProfile.telefoneWhatsapp ?? '');
      return;
    }

    this.prefillEmailFromLoggedUser();
  }

  get isTipoOutroSelected(): boolean {
    return this.profileForm.get('tipoOlheiro')?.value === 'Outro';
  }

  get sobreMimLength(): number {
    return this.getControlValueLength('sobreMim');
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

    if (cleaned.length <= 2) {
      return cleaned ? `(${cleaned}` : '';
    }

    if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    }

    if (cleaned.length <= 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }

    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }

  isValidUrl(url: string): boolean {
    const normalizedUrl = (url ?? '').trim();
    return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(normalizedUrl) || normalizedUrl.startsWith('data:image/');
  }

  onPhoneInput(event: Event): void {
    const target = event.target as { value?: string | number | null } | null;
    const rawValue = target?.value?.toString() ?? '';
    const digits = this.onlyDigits(rawValue).slice(0, 11);

    this.phoneDisplayValue = this.formatPhoneBR(digits);
    this.profileForm.get('telefoneWhatsapp')?.setValue(digits);
    this.profileForm.get('telefoneWhatsapp')?.markAsDirty();
    this.profileForm.get('telefoneWhatsapp')?.updateValueAndValidity();
  }

  markAsTouched(controlName: string): void {
    this.profileForm.get(controlName)?.markAsTouched();
  }

  triggerPhotoSelection(): void {
    this.photoInput?.nativeElement.click();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      this.profileForm.get('fotoPerfilUrl')?.setValue(result);
    };
    reader.readAsDataURL(file);
  }

  async showDocumentUploadInfo(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Enviar documento',
      message: 'O upload de documentos estara disponivel na V2. Neste MVP, a verificacao permanece pendente.',
      buttons: ['Fechar']
    });

    await alert.present();
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
      const profile: ScoutProfile = {
        nomeCompleto: formValue.nomeCompleto.trim(),
        fotoPerfilUrl: this.normalizeOptionalValue(formValue.fotoPerfilUrl),
        tipoOlheiro: formValue.tipoOlheiro as ScoutTypeOption,
        tipoOlheiroOutroTexto: this.normalizeOptionalValue(formValue.tipoOlheiroOutroTexto),
        organizacaoOuClube: this.normalizeOptionalValue(formValue.organizacaoOuClube),
        cargoOuFuncao: this.normalizeOptionalValue(formValue.cargoOuFuncao),
        email: formValue.email.trim(),
        telefoneWhatsapp: this.onlyDigits(formValue.telefoneWhatsapp),
        cidade: formValue.cidade.trim(),
        estado: formValue.estado,
        pais: formValue.pais.trim(),
        idioma: null,
        modalidade: formValue.modalidade,
        categoriasIdadeAlvo: formValue.categoriasIdadeAlvo,
        posicoesInteresse: formValue.posicoesInteresse,
        regiaoAtuacaoTexto: formValue.regiaoAtuacaoTexto.trim(),
        documentoVerificado: !!formValue.documentoVerificado,
        documentoUploadId: this.normalizeOptionalValue(formValue.documentoUploadId),
        linkReferencia: this.normalizeOptionalValue(formValue.linkReferencia),
        aceitouTermos: !!formValue.aceitouTermos,
        sobreMim: formValue.sobreMim.trim(),
        oQueBuscaNoBeSeen: this.normalizeOptionalValue(formValue.oQueBuscaNoBeSeen)
      };

      await this.scoutProfileService.saveProfile(profile);

      const toast = await this.toastController.create({
        message: 'Perfil salvo',
        duration: 2000,
        color: 'success',
        position: 'top'
      });

      await toast.present();
      await this.router.navigate(['/scout-home']);
    } finally {
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

  trackByValue(_: number, value: string): string {
    return value;
  }

  goBack(): void {
    this.location.back();
  }

  private setupConditionalValidation(): void {
    const tipoOlheiroControl = this.profileForm.get('tipoOlheiro');
    const outroTextoControl = this.profileForm.get('tipoOlheiroOutroTexto');

    tipoOlheiroControl?.valueChanges.subscribe(selectedType => {
      if (selectedType === 'Outro') {
        outroTextoControl?.setValidators([Validators.required, Validators.minLength(3)]);
      } else {
        outroTextoControl?.clearValidators();
        outroTextoControl?.setValue('', { emitEvent: false });
      }

      outroTextoControl?.updateValueAndValidity({ emitEvent: false });
    });
  }

  private prefillEmailFromLoggedUser(): void {
    this.authService.currentUser.pipe(take(1)).subscribe((user: User | null) => {
      const emailControl = this.profileForm.get('email');
      if (user?.email && emailControl && !emailControl.value) {
        emailControl.setValue(user.email);
      }
    });
  }

  private normalizeOptionalValue(value: string | null | undefined): string | null {
    const trimmedValue = (value ?? '').trim();
    return trimmedValue ? trimmedValue : null;
  }

  private getControlValueLength(controlName: string): number {
    return ((this.profileForm.get(controlName)?.value ?? '') as string).length;
  }
}
