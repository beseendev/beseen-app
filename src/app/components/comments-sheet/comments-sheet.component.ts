import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, IonicModule, ModalController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, sendOutline, trashOutline } from 'ionicons/icons';
import { CommentResponse } from '../../models/comment.model';
import { CommentService } from '../../services/comment.service';

@Component({
  selector: 'app-comments-sheet',
  templateUrl: './comments-sheet.component.html',
  styleUrls: ['./comments-sheet.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class CommentsSheetComponent implements OnInit {
  @Input({ required: true }) postId!: string;
  @Input() commentsCount = 0;
  /** Chamado a cada mudança do total (novo comentário ou exclusão) para o card sincronizar o contador. */
  @Input() onCountChange?: (count: number) => void;

  comments: CommentResponse[] = [];
  draft = '';
  isLoading = true;
  isSending = false;
  private nextCursor: string | null = null;

  private readonly commentService = inject(CommentService);
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);
  private readonly router = inject(Router);

  constructor() {
    addIcons({ closeOutline, sendOutline, trashOutline });
  }

  ngOnInit(): void {
    this.commentService.getComments(this.postId).subscribe({
      next: page => {
        this.comments = page.items;
        this.nextCursor = page.nextCursor;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.showToast('Não foi possível carregar os comentários.');
      }
    });
  }

  loadMore(event: Event): void {
    const target = event.target as HTMLIonInfiniteScrollElement;
    if (!this.nextCursor) {
      target.complete();
      return;
    }
    this.commentService.getComments(this.postId, 15, this.nextCursor).subscribe({
      next: page => {
        this.comments = [...this.comments, ...page.items];
        this.nextCursor = page.nextCursor;
        target.complete();
      },
      error: () => target.complete()
    });
  }

  get nextCursorAvailable(): boolean {
    return !!this.nextCursor;
  }

  get canSend(): boolean {
    return !this.isSending && this.draft.trim().length > 0;
  }

  send(): void {
    const content = this.draft.trim();
    if (!content || this.isSending) {
      return;
    }
    this.isSending = true;
    this.commentService.createComment(this.postId, content).subscribe({
      next: comment => {
        this.comments = [comment, ...this.comments];
        this.draft = '';
        this.isSending = false;
        this.updateCount(this.commentsCount + 1);
      },
      error: () => {
        this.isSending = false;
        this.showToast('Não foi possível enviar o comentário.');
      }
    });
  }

  async confirmDelete(comment: CommentResponse): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Excluir comentário',
      message: 'Deseja excluir este comentário?',
      cssClass: 'be-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Excluir', role: 'destructive', handler: () => this.delete(comment) }
      ]
    });
    await alert.present();
  }

  private delete(comment: CommentResponse): void {
    this.commentService.deleteComment(comment.id).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.id !== comment.id);
        this.updateCount(Math.max(0, this.commentsCount - 1));
      },
      error: () => this.showToast('Não foi possível excluir o comentário.')
    });
  }

  async openProfile(comment: CommentResponse): Promise<void> {
    await this.modalController.dismiss();
    if (comment.isMine) {
      this.router.navigateByUrl('/profile-player');
      return;
    }
    this.router.navigate(['/profile-player', comment.profileId]);
  }

  close(): void {
    this.modalController.dismiss();
  }

  timeAgo(dateStr: string): string {
    const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} d`;
    return new Date(dateStr).toLocaleDateString('pt-BR');
  }

  trackById(_: number, comment: CommentResponse): number {
    return comment.id;
  }

  private updateCount(count: number): void {
    this.commentsCount = count;
    this.onCountChange?.(count);
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 2500, color: 'danger', position: 'top' });
    await toast.present();
  }
}

/** Abre o sheet de comentários; `onCountChange` recebe o novo total a cada comentário criado/removido. */
export async function openCommentsSheet(
  modalController: { create: (opts: any) => Promise<HTMLIonModalElement> },
  postId: string,
  commentsCount: number,
  onCountChange: (count: number) => void
): Promise<void> {
  const modal = await modalController.create({
    component: CommentsSheetComponent,
    componentProps: { postId, commentsCount, onCountChange },
    cssClass: 'comments-sheet-modal'
  });
  await modal.present();
}
