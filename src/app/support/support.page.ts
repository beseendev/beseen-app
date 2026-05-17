import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  helpCircleOutline,
  mailOutline,
  sendOutline
} from 'ionicons/icons';
import { AuthService, JwtPayload } from '../services/auth.service';

type SupportType = 'Sugestão' | 'Reclamação' | 'Problema técnico' | 'Dúvida';

@Component({
  selector: 'app-support',
  templateUrl: './support.page.html',
  styleUrls: ['./support.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    IonItem,
    IonList,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonTextarea
  ]
})
export class SupportPage implements OnInit {
  readonly supportEmail = 'suporte@beseen.com.br';
  readonly typeOptions: SupportType[] = ['Sugestão', 'Reclamação', 'Problema técnico', 'Dúvida'];

  private readonly fb = inject(FormBuilder);
  readonly supportForm = this.fb.group({
    type: ['Sugestão' as SupportType, [Validators.required]],
    subject: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(90)]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1200)]],
    replyEmail: ['', [Validators.required, Validators.email]]
  });

  private readonly authService = inject(AuthService);
  private readonly location = inject(Location);
  private readonly toastController = inject(ToastController);

  constructor() {
    addIcons({ arrowBackOutline, helpCircleOutline, mailOutline, sendOutline });
  }

  ngOnInit(): void {
    const decoded = this.authService.getDecodedToken<JwtPayload>();
    decoded?.email && this.supportForm.get('replyEmail')?.setValue(decoded.email);
  }

  get messageLength(): number {
    return (this.supportForm.get('message')?.value ?? '').length;
  }

  goBack(): void {
    this.location.back();
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.supportForm.get(controlName);
    return !!control && control.hasError(errorName) && (control.touched || control.dirty);
  }

  async submitSupportRequest(): Promise<void> {
    if (this.supportForm.invalid) {
      this.supportForm.markAllAsTouched();
      return;
    }

    const value = this.supportForm.getRawValue();
    const now = new Date().toLocaleString('pt-BR');

    const subject = `BeSeen - ${value.type} - ${value.subject}`;

    const body = [
      '--- ⚽ SOLICITAÇÃO DE SUPORTE BESEEN ---',
      '',
      `🏷️ TIPO: ${value.type}`,
      `📧 E-MAIL DE RETORNO: ${value.replyEmail}`,
      `📅 DATA: ${now}`,
      '',
      '-------------------------------------------',
      '📝 MENSAGEM:',
      value.message,
      '',
      '-------------------------------------------',
      '🚀 Enviado via App BeSeen'
    ].join('\n');

    window.location.href = `mailto:${this.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const toast = await this.toastController.create({
      message: 'Abrindo seu aplicativo de email para enviar a mensagem.',
      duration: 2200,
      color: 'success',
      position: 'top'
    });

    await toast.present();
    this.goBack();
  }
}
