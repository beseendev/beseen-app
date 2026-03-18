import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
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
export class LoginPage implements AfterViewInit {
  @ViewChild('stadiumLightsCanvas') stadiumLightsCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('brandSeenWrap') brandSeenWrap?: ElementRef<HTMLElement>;
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
                const decodedToken = this.authService.getDecodedToken<{ role?: string }>();
                const targetRoute = decodedToken?.role === 'CLUBE' ? '/scout-profile' : '/create-profile';
                this.navCtrl.navigateRoot(targetRoute, {
                  queryParams: { idToken, loginMethod: 'instagram' }
                });
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
            this.navigateToProfileSetup();
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

  private navigateToProfileSetup(): void {
    const decodedToken = this.authService.getDecodedToken<{ role?: string }>();
    const targetRoute = decodedToken?.role === 'CLUBE' ? '/scout-profile' : '/create-profile';
    this.router.navigate([targetRoute]);
  }

  private renderStadiumLights(): void {
    const canvas = this.stadiumLightsCanvas?.nativeElement;
    const seenWrap = this.brandSeenWrap?.nativeElement;
    if (!canvas) {
      return;
    }

    const seenWidth = seenWrap?.getBoundingClientRect().width ?? 0;
    const targetWidth = Math.max(60.021, seenWidth * 0.514425);
    const targetHeight = Math.max(20.577, targetWidth * 0.28293375);
    canvas.style.width = `${targetWidth}px`;
    canvas.style.height = `${targetHeight}px`;

    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    if (!cssWidth || !cssHeight) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

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

  private drawLightGroup(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    angle: number,
    radius: number,
    spacing: number
  ): void {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    for (let i = -1; i <= 1; i++) {
      this.drawPremiumLight(ctx, i * spacing, 0, radius);
    }

    ctx.restore();
  }

  private drawPremiumLight(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number
  ): void {
    const glowRadius = radius * 3.2;
    const greenGlow = ctx.createRadialGradient(x, y, radius * 0.2, x, y, glowRadius);
    greenGlow.addColorStop(0, 'rgba(34, 197, 94, 0.24)');
    greenGlow.addColorStop(0.52, 'rgba(34, 197, 94, 0.12)');
    greenGlow.addColorStop(1, 'rgba(34, 197, 94, 0)');
    ctx.fillStyle = greenGlow;
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.filter = 'blur(1.4px)';
    const softHalo = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius * 1.5);
    softHalo.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
    softHalo.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = softHalo;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const coreGradient = ctx.createRadialGradient(
      x - (radius * 0.25),
      y - (radius * 0.28),
      radius * 0.2,
      x,
      y,
      radius
    );
    coreGradient.addColorStop(0, '#FDFEFE');
    coreGradient.addColorStop(0.58, '#F1F5F9');
    coreGradient.addColorStop(1, '#CBD5E1');
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    const depthShadow = ctx.createRadialGradient(x, y + (radius * 1.35), radius * 0.25, x, y + (radius * 1.35), radius * 1.35);
    depthShadow.addColorStop(0, 'rgba(15, 23, 42, 0.22)');
    depthShadow.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = depthShadow;
    ctx.beginPath();
    ctx.ellipse(x, y + (radius * 1.35), radius * 1.2, radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
