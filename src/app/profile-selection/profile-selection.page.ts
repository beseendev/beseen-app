import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonFooter,
  IonModal,
  IonCheckbox,
  IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, closeOutline, arrowDownOutline } from 'ionicons/icons';
import { Router, ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-profile-selection',
  templateUrl: './profile-selection.page.html',
  styleUrls: ['./profile-selection.page.scss'],
  standalone: true,
  imports: [
    IonContent, CommonModule, ReactiveFormsModule,
    IonButton, IonIcon, IonLabel, IonSegment, IonSegmentButton,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonFooter, IonModal, IonCheckbox, IonSpinner
  ]
})
export class ProfileSelectionPage implements OnInit {
  profileForm: FormGroup;
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private navCtrl = inject(NavController);
  private toastController = inject(ToastController);
  private authService = inject(AuthService);

  idToken: string | null = null;
  loginMethod: string | null = null;
  hasReadToBottom = false;
  isAcceptingTerms = false;

  constructor() {
    addIcons({ arrowBackOutline, closeOutline, arrowDownOutline });
    this.profileForm = this.fb.group({
      role: [null, [Validators.required]],
      acceptedTerms: [false, [Validators.requiredTrue]]
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.idToken = params['idToken'] || null;
      this.loginMethod = params['loginMethod'] || null;
    });

    this.profileForm.get('role')?.valueChanges.subscribe(role => {
      if (!this.profileForm.get('acceptedTerms')?.value) {
        this.showToast('Você precisa aceitar os termos antes de selecionar um perfil.', 'warning');
        setTimeout(() => {
          this.profileForm.get('role')?.setValue(null, { emitEvent: false });
        }, 100);
        return;
      }

      if (role === 'JOGADOR') {
        this.navigateTo('/create-profile-player', role);
      } else if (role === 'CLUBE') {
        this.navigateTo('/create-profile-scout', role);
      }
    });
  }

  confirmAcceptance(modal: any) {
    this.isAcceptingTerms = true;
    this.authService.acceptTerms().pipe(
      finalize(() => this.isAcceptingTerms = false)
    ).subscribe({
      next: () => {
        this.profileForm.get('acceptedTerms')?.setValue(true);
        modal.dismiss();
        this.showToast('Termos aceitos com sucesso!', 'success');
      },
      error: (err: any) => {
        console.error('Erro ao aceitar termos:', err);
        this.showToast('Erro ao registrar aceite dos termos. Tente novamente.', 'danger');
      }
    });
  }

  onTermsScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    const target = event.target;
    target.getScrollElement().then((el: HTMLElement) => {
      const scrollHeight = el.scrollHeight;
      const clientHeight = el.clientHeight;
      if (scrollHeight - scrollTop <= clientHeight + 20) {
        this.hasReadToBottom = true;
      }
    });
  }

  resetTermsRead() {
    this.hasReadToBottom = false;
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    toast.present();
  }

  private navigateTo(path: string, role: string) {
    this.navCtrl.navigateRoot(path, {
      queryParams: {
        idToken: this.idToken,
        loginMethod: this.loginMethod,
        role: role
      },
      animated: true,
      animationDirection: 'forward'
    });
  }

  goBack(): void {
    this.location.back();
  }
}
