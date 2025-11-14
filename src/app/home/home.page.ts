import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, NavController } from '@ionic/angular/standalone';
import { AuthService } from '../services/auth.service';
import { Auth } from '@angular/fire/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent
  ]
})
export class HomePage {

  constructor(
    private authService: AuthService,
    private auth: Auth,
    private navCtrl: NavController
  ) { }

  async logout() {
    try {
      await FirebaseAuthentication.signOut();
      await this.auth.signOut();
    } catch (error) {
      console.error('Erro ao deslogar do Firebase:', error);
    }
    this.authService.logout();
    this.navCtrl.navigateRoot('/login');
  }
}
