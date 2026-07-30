import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBackOutline, closeOutline, flashOutline, footballOutline, imageOutline, starOutline, alertCircleOutline } from 'ionicons/icons';
import { IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonContent, IonTitle, IonTextarea, IonFooter, LoadingController, ToastController } from '@ionic/angular/standalone';
import { UploadPostService } from '../services/upload-post.service';
import { CreatePostFormState } from '../models/post-creation.model';
import { Skill } from '../models/skill.model';
import { SkillService } from '../services/skill.service';
import { SkillSelectorComponent } from '../components/skill-selector/skill-selector.component';

@Component({
  selector: 'app-create-post',
  templateUrl: './create-post.page.html',
  styleUrls: ['./create-post.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonContent, IonTitle, IonTextarea, IonFooter,
    SkillSelectorComponent
  ]
})
export class CreatePostPage implements OnInit {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  selectedMedia: File | null = null;
  selectedMediaUrl: string | null = null;
  selectedMediaDuration: number | null = null;
  postFormState: CreatePostFormState = {
    caption: '',
    selectedSkillIds: []
  };
  availableSkills: Skill[] = [];
  fileError: string | null = null;
  isSubmitting = false;

  private router = inject(Router);
  private uploadPostService = inject(UploadPostService);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private skillService = inject(SkillService);

  constructor() {
    addIcons({ arrowBackOutline, imageOutline, footballOutline, closeOutline, starOutline, flashOutline, alertCircleOutline });
  }

  ngOnInit(): void {
    this.skillService.getSkills().subscribe({
      next: skills => this.availableSkills = skills,
      error: err => console.error('Error loading skills', err)
    });
  }

  get caption(): string {
    return this.postFormState.caption;
  }

  set caption(value: string) {
    this.postFormState = {
      ...this.postFormState,
      caption: value
    };
  }

  onSelectedSkillIdsChange(selectedSkillIds: string[]): void {
    this.postFormState = {
      ...this.postFormState,
      selectedSkillIds
    };
  }

  goBack() {
    this.router.navigateByUrl('/player-home');
  }

  async onFileSelected(event: Event) {
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

      if (!file.type.startsWith('video/')) {
        const toast = await this.toastCtrl.create({
          message: 'Por favor, selecione um arquivo de vídeo.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
        this.removeSelectedMedia();
        return;
      }

      try {
        const duration = await this.getVideoDuration(file);
        this.selectedMediaDuration = duration;
        const maxDuration = 30;

        if (duration > maxDuration) {
          const toast = await this.toastCtrl.create({
            message: `O vídeo deve ter no máximo ${maxDuration} segundos para melhor engajamento.`,
            duration: 4000,
            color: 'warning',
            position: 'top'
          });
          await toast.present();
          this.removeSelectedMedia();
          return;
        }
      } catch (err) {
        console.error('Erro ao verificar duração do vídeo:', err);
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
    this.selectedMediaDuration = null;
    this.onSelectedSkillIdsChange([]);
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    if (clearError) {
      this.fileError = null;
    }
  }

  private getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = (err) => {
        window.URL.revokeObjectURL(video.src);
        reject('Erro ao carregar o vídeo.');
      };
      video.src = URL.createObjectURL(file);
    });
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

    this.uploadPostService.uploadAndCreatePost(
      this.selectedMedia,
      this.caption,
      this.selectedMediaDuration ?? undefined
    ).subscribe({
      next: async (post) => {
        await loading.dismiss();
        this.isSubmitting = false;
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
