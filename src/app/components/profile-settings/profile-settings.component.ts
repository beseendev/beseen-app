import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonIcon, IonPopover, IonList, IonItem, IonLabel, ActionSheetController, AlertController, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { settingsOutline, helpCircleOutline, banOutline, logOutOutline, trashOutline, closeOutline } from 'ionicons/icons';
import { AuthService, JwtPayload } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [IonButton, IonIcon, IonPopover, IonList, IonItem, IonLabel],
  templateUrl: './profile-settings.component.html',
  styleUrls: ['./profile-settings.component.scss']
})
export class ProfileSettingsComponent {
  @Input() accountType: 'player' | 'scout' = 'player';
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  constructor() {
    addIcons({ settingsOutline, helpCircleOutline, banOutline, logOutOutline, trashOutline, closeOutline });
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({ message, duration: this.accountType === 'player' ? 3000 : 4000, color, position: this.accountType === 'player' ? 'top' : 'bottom' });
    await toast.present();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  async openDeleteAccountOptions() {
    const actionSheet = await this.actionSheetController.create({
      cssClass: 'be-action-sheet',
      buttons: [
        {
          text: 'Excluir conta',
          role: 'destructive',
          icon: trashOutline,
          handler: () => {
            this.confirmDeleteAccount();
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel',
          icon: closeOutline
        }
      ]
    });
    await actionSheet.present();
  }

  async confirmDeleteAccount() {
    const alert = await this.alertController.create({
      header: 'Excluir sua conta?',
      message: `Esta ação é permanente. Sua conta, ${this.accountType === 'player' ? 'vídeos' : 'favoritos'}, conversas e todos os seus dados serão removidos em um processamento que pode levar algum tempo para ser concluído.`,
      cssClass: 'be-alert-confirm',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir conta',
          role: 'destructive',
          handler: () => {
            this.deleteAccount();
          }
        }
      ]
    });
    await alert.present();
  }

  private deleteAccount(): void {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    const userId = decodedToken?.userId;

    if (!userId) {
      this.showToast('Não foi possível identificar sua conta. Tente novamente.', 'danger');
      return;
    }

    this.profileService.requestAccountDeletion(userId).subscribe({
      next: async () => {
        this.authService.logout();
        this.router.navigate(['/login']);
        const toast = await this.toastController.create({
          message: 'Recebemos sua solicitação. Sua conta e todos os seus dados serão excluídos em breve. Obrigado por ter feito parte da nossa comunidade!',
          duration: 6000,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();
      },
      error: (err) => {
        console.error('Error requesting account deletion', err);
        this.showToast('Não foi possível processar a exclusão da conta. Tente novamente mais tarde.', 'danger');
      }
    });
  }

}
