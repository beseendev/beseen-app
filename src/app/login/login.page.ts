import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel, IonInput, IonButton, ToastController, IonText, IonIcon } from '@ionic/angular/standalone';
import { AuthService } from '../services/auth.service';
import { Auth, GoogleAuthProvider, signInWithCredential } from '@angular/fire/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonText,
    IonIcon
  ]
})
export class LoginPage {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private auth: Auth, // Injetar Auth do AngularFire
    private navCtrl: NavController // Injetar NavController
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  async signInWithGoogle() {
    try {
      await FirebaseAuthentication.signOut();
      const result = await FirebaseAuthentication.signInWithGoogle();
      if (result.credential) {
        const credential = GoogleAuthProvider.credential(result.credential.idToken, result.credential.accessToken);
        const userCredential = await signInWithCredential(this.auth, credential);

        const idToken = await userCredential.user.getIdToken(true);

        // Enviar idToken para o backend através do AuthService
        this.authService.loginWithFirebaseToken(idToken).subscribe({
          next: () => {
            this.navCtrl.navigateRoot('/home');
          },
          error: async (err) => {
            console.error('Erro ao enviar token Firebase para o backend (detalhado):', JSON.stringify(err));
            const toast = await this.toastController.create({
              message: 'Erro ao fazer login com Google. Tente novamente.',
              duration: 2000,
              color: 'danger'
            });
            toast.present();
          }
        });
      } else {
        const toast = await this.toastController.create({
          message: 'Login com Google cancelado ou falhou.',
          duration: 2000,
          color: 'warning'
        });
        toast.present();
      }
    } catch (error) {
      console.error('Erro no login com Google (detalhado):', JSON.stringify(error));
      const toast = await this.toastController.create({
        message: 'Erro no login com Google. Verifique sua conexão.',
        duration: 2000,
        color: 'danger'
      });
      toast.present();
    }
  }

  login() {
    if (this.loginForm.invalid) {
      return;
    }

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password: password }).subscribe({
      next: () => {
        this.router.navigate(['/home']);
      },
      error: async (err) => {
        console.error('Erro tratado no componente de login:', err);
        const toast = await this.toastController.create({
          message: 'Erro no login. Verifique suas credenciais.',
          duration: 2000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }
}
