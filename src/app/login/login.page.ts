import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonItem, IonInput, IonButton, ToastController, IonIcon } from '@ionic/angular/standalone';
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
    IonContent,
    IonItem,
    IonInput,
    IonButton,
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

        this.authService.loginWithFirebaseToken(idToken).subscribe({
          next: () => this.navCtrl.navigateRoot('/home'),
          error: (err) => this.handleAuthError(err, 'google')
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
      console.error('Erro no plugin de login com Google:', JSON.stringify(error));
      const toast = await this.toastController.create({
        message: 'Erro ao iniciar o login com Google. Verifique sua conexão ou configuração.',
        duration: 3000,
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
      next: () => this.router.navigate(['/home']),
      error: (err) => this.handleAuthError(err, 'email')
    });
  }

  private async handleAuthError(err: any, context: 'google' | 'email') {
    console.error(`Erro na autenticação via ${context}:`, JSON.stringify(err));

    let errorMessage: string;
    const defaultGoogleError = 'Erro ao fazer login com Google. Tente novamente.';
    const defaultEmailError = 'Erro no login. Verifique suas credenciais.';

    if (err.status === 0) {
      errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
    } else if (err.error && err.error.message) {
      errorMessage = err.error.message;
    } else if (typeof err.error === 'string') {
      errorMessage = err.error;
    } else {
      errorMessage = context === 'google' ? defaultGoogleError : defaultEmailError;
    }

    const toast = await this.toastController.create({
      message: errorMessage,
      duration: 3000,
      color: 'danger'
    });
    toast.present();
  }
}
