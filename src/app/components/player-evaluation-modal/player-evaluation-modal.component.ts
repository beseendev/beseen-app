import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonRange, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { statsChartOutline, closeOutline } from 'ionicons/icons';
import { finalize } from 'rxjs/operators';

import { ProfileService } from '../../services/profile.service';
import { PlayerAttributesResponse, PlayerEvaluationRequest } from '../../models/profile.model';

@Component({
  selector: 'app-player-evaluation-modal',
  templateUrl: './player-evaluation-modal.component.html',
  styleUrls: ['./player-evaluation-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, IonRange, IonSpinner],
})
export class PlayerEvaluationModalComponent {
  private profileService = inject(ProfileService);
  private toastController = inject(ToastController);

  @Output() evaluated = new EventEmitter<{ profileId: string; attributes: PlayerAttributesResponse }>();

  isOpen = false;
  isSubmitting = false;
  athleteName: string | null = null;
  private profileId: string | null = null;

  form: PlayerEvaluationRequest = { ata: 50, def: 50, hab: 50, forca: 50 };

  constructor() {
    addIcons({ statsChartOutline, closeOutline });
  }

  open(profileId: string, athleteName?: string | null): void {
    if (!profileId) {
      return;
    }

    this.profileId = profileId;
    this.athleteName = athleteName ?? null;
    this.form = { ata: 50, def: 50, hab: 50, forca: 50 };
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
  }

  submit(): void {
    if (!this.profileId || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.profileService.evaluatePlayer(this.profileId, this.form).pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: (attributes) => {
        this.isOpen = false;
        this.evaluated.emit({ profileId: this.profileId!, attributes });
        this.showToast('Avaliação enviada com sucesso!', 'success');
      }
    });
  }

  private async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 4000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
