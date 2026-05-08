import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController, ToastController, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { SubscriptionService } from '../../services/subscription.service';
import { Plan } from '../../models/subscription.model';

@Component({
  selector: 'app-plans-modal',
  templateUrl: './plans-modal.component.html',
  styleUrls: ['./plans-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonButton, IonSpinner
  ]
})
export class PlansModalComponent implements OnInit {
  private subscriptionService = inject(SubscriptionService);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);

  plans: Plan[] = [];
  loading = true;
  purchasing = false;

  ngOnInit() {
    this.loadPlans();
  }

  loadPlans() {
    this.subscriptionService.getPlans().subscribe({
      next: (plans) => {
        this.plans = plans;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar planos', err);
        this.loading = false;
        this.showToast('Erro ao carregar planos. Tente novamente.', 'danger');
      }
    });
  }

  async subscribe(plan: Plan) {
    this.purchasing = true;
    try {
      await this.subscriptionService.purchasePlan(plan);
      this.showToast('Assinatura realizada com sucesso!', 'success');
      this.modalCtrl.dismiss(true);
    } catch (error) {
      console.error('Erro ao realizar assinatura', error);
      this.showToast('Erro ao processar assinatura. Verifique seus dados.', 'danger');
    } finally {
      this.purchasing = false;
    }
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    toast.present();
  }
}
