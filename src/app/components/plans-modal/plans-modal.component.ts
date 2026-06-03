import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController, ToastController, IonContent, IonButton, IonSpinner, IonIcon, IonBadge } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  cardOutline,
  checkmarkCircleOutline,
  flashOutline,
  shieldCheckmarkOutline,
  starOutline
} from 'ionicons/icons';
import { SubscriptionService } from '../../services/subscription.service';
import { AuthService, JwtPayload } from '../../services/auth.service';
import { Plan, SubscriptionStatus } from '../../models/subscription.model';
import { ScoutTypeOption } from '../../models/scout-profile.model';

@Component({
  selector: 'app-plans-modal',
  templateUrl: './plans-modal.component.html',
  styleUrls: ['./plans-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonButton, IonSpinner, IonIcon, IonBadge
  ]
})
export class PlansModalComponent implements OnInit {
  private subscriptionService = inject(SubscriptionService);
  private authService = inject(AuthService);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);

  plans: Plan[] = [];
  loading = true;
  purchasing = false;

  isCurrentPlan(plan: Plan): boolean {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    if (!decodedToken) return false;

    const isSamePlan = decodedToken.planName === plan.name;
    const isStatusActive = decodedToken.subscriptionStatus === SubscriptionStatus.ACTIVE;
    const isDateValid = decodedToken.subscriptionEndDate
      ? new Date(decodedToken.subscriptionEndDate) > new Date()
      : true;

    return isSamePlan && isStatusActive && isDateValid;
  }

  constructor() {
    addIcons({
      arrowBackOutline,
      cardOutline,
      checkmarkCircleOutline,
      flashOutline,
      shieldCheckmarkOutline,
      starOutline
    });
  }

  ngOnInit() {
    this.loadPlans();
  }

  get isExpired(): boolean {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    if (decodedToken?.role !== 'CLUBE') return false;

    const isStatusActive = decodedToken.subscriptionStatus === SubscriptionStatus.ACTIVE;
    const isDateExpired = decodedToken.subscriptionEndDate
      ? new Date(decodedToken.subscriptionEndDate) < new Date()
      : false;

    return !isStatusActive || isDateExpired;
  }

  get scoutType(): ScoutTypeOption | null {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    return (decodedToken?.scoutType as ScoutTypeOption) || null;
  }

  get rulesSummary(): string {
    if (this.scoutType === 'Clube') {
      return 'Seu tipo de olheiro exige o plano Clube para acessar vídeos, perfis, chat e o ambiente de olheiro.';
    }

    if (this.scoutType) {
      return 'Seu tipo de olheiro pode contratar Visualização para ver vídeos ou Contato para liberar perfis e chat.';
    }

    return 'Complete seu perfil de olheiro para indicarmos automaticamente os planos permitidos para sua atuação.';
  }

  getDisplayScoutType(type: ScoutTypeOption): string {
    return type === 'Empresario' ? 'Empresário' : type;
  }

  getPlanIcon(plan: Plan): string {
    if (plan.name.toLowerCase().includes('clube')) return 'shield-checkmark-outline';
    if (plan.name.toLowerCase().includes('contato')) return 'star-outline';
    return 'card-outline';
  }

  getPlanBadge(plan: Plan): string | null {
    if (plan.name.toLowerCase().includes('clube')) return 'Obrigatório para Clube';
    if (plan.featured) return 'Mais completo';
    return null;
  }

  loadPlans() {
    this.subscriptionService.getPlans().subscribe({
      next: (plans) => {
        if (this.scoutType === 'Clube') {
          this.plans = plans.filter(p => p.name.toLowerCase().includes('clube'));
        } else {
          this.plans = plans.filter(p => !p.name.toLowerCase().includes('clube'));
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar planos', err);
        this.loading = false;
        this.showToast('Erro ao carregar planos. Tente novamente.', 'danger');
      }
    });
  }

  async selectPlan(plan: Plan) {
    this.purchasing = true;
    try {
      await this.subscriptionService.purchasePlan(plan);

      this.authService.refreshToken().subscribe({
        next: () => {
          this.showToast('Assinatura ativada com sucesso!', 'success');
          this.modalCtrl.dismiss(true);
        },
        error: () => {
          this.showToast('Assinatura realizada! Por favor, recarregue a página se necessário.', 'success');
          this.modalCtrl.dismiss(true);
        }
      });
    } catch (error: any) {
      if (error.userCancelled) {
        return;
      }
      
      console.error('--- ERRO NA ASSINATURA ---', error);
      
      const msg = error.message || 'Erro desconhecido';
      const code = error.code || 'Sem código';
      // Mostra uma versão resumida do objeto de erro no Toast
      const details = JSON.stringify(error).substring(0, 120);

      this.showToast(`Erro: ${msg} | Código: ${code} | Detalhes: ${details}`, 'danger');
    } finally {
      this.purchasing = false;
    }
  }

  async restorePurchases() {
    this.loading = true;
    try {
      const sub = await this.subscriptionService.restorePurchases();
      if (sub) {
        this.authService.refreshToken().subscribe({
          next: () => {
            this.showToast('Assinatura restaurada com sucesso!', 'success');
            this.modalCtrl.dismiss(true);
          }
        });
      } else {
        this.showToast('Nenhuma assinatura ativa encontrada para restaurar.', 'warning');
      }
    } catch (error) {
      this.showToast('Erro ao restaurar compras. Tente novamente.', 'danger');
    } finally {
      this.loading = false;
    }
  }

  goBack() {
    this.modalCtrl.dismiss();
  }

  trackByPlan(_: number, plan: Plan): number {
    return plan.id;
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    toast.present();
  }
}
