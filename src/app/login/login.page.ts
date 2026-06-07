import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonContent, IonItem, IonInput, IonButton, ToastController, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { AuthService, User, JwtPayload } from '../services/auth.service';
import { Auth, GoogleAuthProvider, OAuthProvider, signInWithCredential } from '@angular/fire/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { SignInWithApple, SignInWithAppleResponse } from '@capacitor-community/apple-sign-in';
import { Capacitor } from '@capacitor/core';
import { NavController } from '@ionic/angular';
import { take, finalize } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import {
  personOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  logoFacebook,
  logoGoogle,
  logoTwitter,
  logoApple
} from 'ionicons/icons';

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
export class LoginPage implements AfterViewInit {
  @ViewChild('stadiumLightsCanvas') stadiumLightsCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('brandSeenWrap') brandSeenWrap?: ElementRef<HTMLElement>;
  loginForm: FormGroup;
  showPassword = false;
  isLoading = false;
  isGoogleLoading = false;
  isAppleLoading = false;
  isIos = Capacitor.getPlatform() === 'ios';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private auth: Auth,
    private navCtrl: NavController
  ) {
    addIcons({
      personOutline,
      lockClosedOutline,
      eyeOutline,
      eyeOffOutline,
      logoFacebook,
      logoGoogle,
      logoTwitter,
      logoApple
    });
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  ngAfterViewInit(): void {
    this.scheduleLightsRender();
  }

  ionViewDidEnter(): void {
    this.scheduleLightsRender();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.scheduleLightsRender();
  }

  async signInWithGoogle() {
    this.isGoogleLoading = true;
    try {
      await FirebaseAuthentication.signOut().catch(() => {});
      const result = await FirebaseAuthentication.signInWithGoogle();

      if (result.credential) {
        const credential = GoogleAuthProvider.credential(result.credential.idToken, result.credential.accessToken);
        const userCredential = await signInWithCredential(this.auth, credential);
        const idToken = await userCredential.user.getIdToken(true);

        this.authService.loginWithFirebaseToken(idToken).pipe(
          finalize(() => this.isGoogleLoading = false)
        ).subscribe({
          next: () => this.handlePostLogin(idToken),
          error: (err) => this.handleAuthError(err, 'google')
        });
      } else {
        this.isGoogleLoading = false;
        this.showToast('Login com Google cancelado ou falhou.', 'warning');
      }
    } catch (error) {
      this.isGoogleLoading = false;
      console.error('Erro no plugin de login com Google:', error);
      this.showToast('Erro ao iniciar o login com Google.', 'danger');
    }
  }

  async signInWithApple() {
    this.isAppleLoading = true;
    try {
      const res: SignInWithAppleResponse = await SignInWithApple.authorize({
        clientId: 'com.beseen.official.app',
        redirectURI: '',
        scopes: 'email name',
      });

      if (res.response && res.response.identityToken) {
        const provider = new OAuthProvider('apple.com');
        const credential = provider.credential({
          idToken: res.response.identityToken
        });

        const userCredential = await signInWithCredential(this.auth, credential);
        const idToken = await userCredential.user.getIdToken(true);
        let fullName = '';
        if (res.response.givenName) {
          fullName = `${res.response.givenName} ${res.response.familyName || ''}`.trim();
        } else if (userCredential.user.displayName) {
          fullName = userCredential.user.displayName;
        }

        this.authService.loginWithAppleToken(idToken, fullName).pipe(
          finalize(() => this.isAppleLoading = false)
        ).subscribe({
          next: () => this.handlePostLogin(idToken),
          error: (err) => this.handleAuthError(err, 'google')
        });
      } else {
        this.isAppleLoading = false;
        this.showToast('Login com Apple cancelado ou falhou.', 'warning');
      }
    } catch (error) {
      this.isAppleLoading = false;
      console.error('Erro no login com Apple:', error);
      this.showToast('Erro ao iniciar o login com Apple.', 'danger');
    }
  }

  private handlePostLogin(idToken: string) {
    this.authService.currentUser.pipe(take(1)).subscribe((user: User | null) => {
      const decodedToken = this.authService.getDecodedToken<JwtPayload>();
      const role = decodedToken?.role;
      if (user && user.hasProfile) {
        if (role === 'CLUBE') {
          this.navCtrl.navigateRoot('/scout-home');
        } else if (role === 'JOGADOR') {
          this.navCtrl.navigateRoot('/player-home');
        }
      } else {
        this.navCtrl.navigateRoot('/profile-selection', {
          queryParams: { idToken, loginMethod: 'social' }
        });
      }
    });
  }

  async socialLoginComingSoon(platform: string) {
    this.showToast(`Login com ${platform} estará disponível em breve!`, 'warning');
  }

  login() {
    if (this.loginForm.invalid) {
      return;
    }
    this.isLoading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: () => {
        this.authService.currentUser.pipe(take(1)).subscribe((user: User | null) => {
          const decodedToken = this.authService.getDecodedToken<JwtPayload>();
          const role = decodedToken?.role;
          if (user && user.hasProfile) {
            if (role === 'CLUBE') {
              this.navCtrl.navigateRoot('/scout-home');
            } else if (role === 'JOGADOR') {
              this.navCtrl.navigateRoot('/player-home');
            }

          } else {
            this.navigateToProfileSetup(role);
          }
        });
      },
      error: (err) => {
        if (err.isUserNotEnabled) {
          this.router.navigate(['/account-confirmation'], { state: { email } });
        } else {
          this.handleAuthError(err, 'email');
        }
      }
    });
  }

  private navigateToProfileSetup(role: string | undefined): void {
    if (role === 'CLUBE') {
      this.navCtrl.navigateRoot('/create-profile-scout');
    } else if (role === 'JOGADOR') {
      this.navCtrl.navigateRoot('/create-profile-player');
    } else {
      this.navCtrl.navigateRoot('/profile-selection');
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({ message, duration: 3000, color });
    toast.present();
  }

  private async handleAuthError(err: any, context: 'google' | 'email') {
    let errorMessage = err.error?.message || err.error || 'Erro na autenticação.';
    this.showToast(errorMessage, 'danger');
  }

  private renderStadiumLights(): void {
    const canvas = this.stadiumLightsCanvas?.nativeElement;
    const seenWrap = this.brandSeenWrap?.nativeElement;
    if (!canvas) return;

    const seenWidth = seenWrap?.getBoundingClientRect().width ?? 0;
    const targetWidth = Math.max(60.021, seenWidth * 0.514425);
    const targetHeight = Math.max(20.577, targetWidth * 0.28293375);
    canvas.style.width = `${targetWidth}px`;
    canvas.style.height = `${targetHeight}px`;

    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    if (!cssWidth || !cssHeight) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const groupY = cssHeight * 0.5;
    const groupOffsetX = cssWidth * 0.26;
    const leftGroupX = (cssWidth / 2) - groupOffsetX;
    const rightGroupX = (cssWidth / 2) + groupOffsetX;
    const lightRadius = Math.max(3.4295, Math.min(cssWidth, cssHeight) * 0.102885);
    const dotSpacing = lightRadius * 2.05;

    this.drawLightGroup(ctx, leftGroupX, groupY, -0.24, lightRadius, dotSpacing);
    this.drawLightGroup(ctx, rightGroupX, groupY, 0.24, lightRadius, dotSpacing);
  }

  private scheduleLightsRender(): void {
    requestAnimationFrame(() => {
      this.renderStadiumLights();
      setTimeout(() => this.renderStadiumLights(), 40);
    });
  }

  private drawLightGroup(ctx: any, centerX: number, centerY: number, angle: number, radius: number, spacing: number): void {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    for (let i = -1; i <= 1; i++) {
      this.drawPremiumLight(ctx, i * spacing, 0, radius);
    }
    ctx.restore();
  }

  private drawPremiumLight(ctx: any, x: number, y: number, radius: number): void {
    const glowRadius = radius * 3.2;
    const greenGlow = ctx.createRadialGradient(x, y, radius * 0.2, x, y, glowRadius);
    greenGlow.addColorStop(0, 'rgba(34, 197, 94, 0.24)');
    greenGlow.addColorStop(1, 'rgba(34, 197, 94, 0)');
    ctx.fillStyle = greenGlow;
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    const coreGradient = ctx.createRadialGradient(x - (radius * 0.25), y - (radius * 0.28), radius * 0.2, x, y, radius);
    coreGradient.addColorStop(0, '#FDFEFE');
    coreGradient.addColorStop(1, '#CBD5E1');
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
