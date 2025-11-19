import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonContent, IonItem, IonInput, IonButton, ToastController, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { AuthService, User } from '../services/auth.service';
import { Auth, GoogleAuthProvider, signInWithCredential } from '@angular/fire/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { NavController } from '@ionic/angular';
import { take, finalize } from 'rxjs/operators';

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
    IonIcon,
    RouterModule,
    IonSpinner
  ]
})
export class LoginPage {
  loginForm: FormGroup;
  showPassword = false;
  isLoading = false;
  isGoogleLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private auth: Auth,
    private navCtrl: NavController
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async signInWithGoogle() {
    this.isGoogleLoading = true;
    try {
      await FirebaseAuthentication.signOut().catch(() => {}); // Ignore sign out errors
      const result = await FirebaseAuthentication.signInWithGoogle();

      if (result.credential) {
        const credential = GoogleAuthProvider.credential(result.credential.idToken, result.credential.accessToken);
        const userCredential = await signInWithCredential(this.auth, credential);
        const idToken = await userCredential.user.getIdToken(true);

        this.authService.loginWithFirebaseToken(idToken).pipe(
          finalize(() => this.isGoogleLoading = false)
        ).subscribe({
          next: () => {
            this.authService.currentUser.pipe(take(1)).subscribe((user: User | null) => {
              if (user && user.hasProfile) {
                this.navCtrl.navigateRoot('/home');
              } else {
                this.navCtrl.navigateRoot('/create-profile');
              }
            });
          },
          error: (err) => this.handleAuthError(err, 'google')
        });
      } else {
        this.isGoogleLoading = false;
        const toast = await this.toastController.create({
          message: 'Login com Google cancelado ou falhou.',
          duration: 2000,
          color: 'warning'
        });
        toast.present();
      }
    } catch (error) {
      this.isGoogleLoading = false;
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
    this.isLoading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password: password }).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: () => {
        this.authService.currentUser.pipe(take(1)).subscribe((user: User | null) => {
          if (user && user.hasProfile) {
            this.router.navigate(['/home']);
          } else {
            this.router.navigate(['/create-profile']);
          }
        });
      },
      error: (err) => {
        if (err.isUserNotEnabled) {
          this.router.navigate(['/account-confirmation'], {
            state: { email: email }
          });
        } else {
          this.handleAuthError(err, 'email');
        }
      }
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