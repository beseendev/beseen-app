import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { Share } from '@capacitor/share';
import { PostService } from './post.service';

@Injectable({
  providedIn: 'root'
})
export class VideoShareService {
  private postService = inject(PostService);
  private toastController = inject(ToastController);

  /** Gera (ou reaproveita) o link curto do vídeo e abre a folha de compartilhamento do sistema. */
  async share(postId: string, athleteName?: string): Promise<void> {
    try {
      const { url } = await new Promise<{ url: string }>((resolve, reject) =>
        this.postService.createShareLink(postId).subscribe({ next: resolve, error: reject })
      );

      const firstName = athleteName?.trim().split(' ')[0];
      const title = firstName ? `${firstName} no BeSeen` : 'Vídeo no BeSeen';

      const { value: canShare } = await Share.canShare();
      if (canShare) {
        await Share.share({
          title,
          text: 'Confira este lance no BeSeen. Talento precisa ser visto.',
          url,
          dialogTitle: 'Compartilhar vídeo'
        });
      } else {
        await navigator.clipboard.writeText(url);
        await this.showToast('Link copiado!', 'success');
      }
    } catch (err: any) {
      // Cancelar a folha de compartilhamento não é erro.
      if (typeof err?.message === 'string' && /cancel/i.test(err.message)) {
        return;
      }
      console.error('Error sharing video', err);
      await this.showToast('Não foi possível gerar o link. Tente novamente.', 'danger');
    }
  }

  private async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 2500, color, position: 'top' });
    await toast.present();
  }
}
