import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBackOutline, closeOutline, footballOutline, imageOutline, starOutline } from 'ionicons/icons';
import { IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonContent, IonTitle, IonTextarea, IonFooter, LoadingController, ToastController } from '@ionic/angular/standalone';
import { UploadPostService } from '../services/upload-post.service';

@Component({
  selector: 'app-create-post',
  templateUrl: './create-post.page.html',
  styleUrls: ['./create-post.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonContent, IonTitle, IonTextarea, IonFooter
  ]
})
export class CreatePostPage implements OnInit {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  selectedMedia: File | null = null;
  selectedMediaUrl: string | null = null;
  caption: string = '';
  fileError: string | null = null;
  isSubmitting = false;

  private router = inject(Router);
  private uploadPostService = inject(UploadPostService);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);

  constructor() {
    addIcons({ arrowBackOutline, imageOutline, footballOutline, closeOutline, starOutline });
  }

  ngOnInit() {
  }

  goBack() {
    this.router.navigateByUrl('/player-home');
  }

  onFileSelected(event: Event) {
    this.fileError = null;
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const maxFileSize = 100 * 1024 * 1024;

      if (file.size > maxFileSize) {
        this.fileError = 'O arquivo excede o tamanho máximo de 100MB.';
        this.removeSelectedMedia();
        return;
      }

      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        this.fileError = 'Por favor, selecione um arquivo de imagem ou vídeo.';
        this.removeSelectedMedia();
        return;
      }

      this.selectedMedia = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedMediaUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.removeSelectedMedia(false);
    }
  }

  removeSelectedMedia(clearError = true) {
    this.selectedMedia = null;
    this.selectedMediaUrl = null;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    if (clearError) {
      this.fileError = null;
    }
  }

  async submitPost() {
    if (!this.selectedMedia) {
      this.fileError = 'Selecione uma imagem ou vídeo para publicar.';
      return;
    }

    this.isSubmitting = true;
    const loading = await this.loadingCtrl.create({
      message: 'Criando post...',
      duration: 0
    });
    await loading.present();

    this.uploadPostService.uploadAndCreatePost(this.selectedMedia, this.caption).subscribe({
      next: async (post) => {
        await loading.dismiss();
        this.isSubmitting = false;
        const toast = await this.toastCtrl.create({
          message: 'Post criado com sucesso!',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
        console.log('Post created:', post);
        this.router.navigateByUrl('/player-home');
      },
      error: async (err) => {
        await loading.dismiss();
        this.isSubmitting = false;
        const toast = await this.toastCtrl.create({
          message: `Erro ao criar post: ${err.message || 'Tente novamente.'}`,
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
        console.error('Error creating post:', err);
      }
    });
  }
}
