import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBackOutline, imageOutline } from 'ionicons/icons';
import { IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonContent, IonTitle, IonTextarea, IonText, IonItem, LoadingController, ToastController } from '@ionic/angular/standalone';
import { UploadPostService } from '../services/upload-post.service';

@Component({
  selector: 'app-create-post',
  templateUrl: './create-post.page.html',
  styleUrls: ['./create-post.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonContent, IonTitle, IonTextarea, IonText, IonItem // Existing Ionic modules
  ]
})
export class CreatePostPage implements OnInit {
  selectedMedia: File | null = null;
  selectedMediaUrl: string | null = null;
  caption: string = '';
  fileError: string | null = null;

  private router = inject(Router);
  private uploadPostService = inject(UploadPostService); // Injected new service
  private loadingCtrl = inject(LoadingController); // Injected LoadingController
  private toastCtrl = inject(ToastController); // Injected ToastController

  constructor() {
    addIcons({ arrowBackOutline, imageOutline });
  }

  ngOnInit() {
  }

  goBack() {
    this.router.navigateByUrl('/home');
  }

  onFileSelected(event: Event) {
    this.fileError = null; // Reset error
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const maxFileSize = 100 * 1024 * 1024; // 100 MB

      if (file.size > maxFileSize) {
        this.fileError = 'O arquivo excede o tamanho máximo de 100MB.';
        this.selectedMedia = null;
        this.selectedMediaUrl = null;
        return;
      }

      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        this.fileError = 'Por favor, selecione um arquivo de imagem ou vídeo.';
        this.selectedMedia = null;
        this.selectedMediaUrl = null;
        return;
      }

      this.selectedMedia = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedMediaUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedMedia = null;
      this.selectedMediaUrl = null;
    }
  }

  async submitPost() {
    if (!this.selectedMedia || !this.caption) {
      this.fileError = 'Selecione uma imagem/vídeo e adicione uma legenda.';
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Criando post...',
      duration: 0 // Will be dismissed manually
    });
    await loading.present();

    this.uploadPostService.uploadAndCreatePost(this.selectedMedia, this.caption).subscribe({
      next: async (post) => {
        await loading.dismiss();
        const toast = await this.toastCtrl.create({
          message: 'Post criado com sucesso!',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
        console.log('Post created:', post);
        this.router.navigateByUrl('/home'); // Navigate back to home or profile
      },
      error: async (err) => {
        await loading.dismiss();
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
