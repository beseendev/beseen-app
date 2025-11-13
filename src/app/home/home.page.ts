import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, NavController } from '@ionic/angular/standalone'; // Adicionado NavController aqui
import { AuthService } from '../services/auth.service';
import { Auth } from '@angular/fire/auth'; // Importado Auth
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'; // Importado FirebaseAuthentication

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
    private router: Router,
    private auth: Auth, // Injetado Auth
    private navCtrl: NavController // Injetado NavController
  ) { }

  async logout() { // Tornar o método assíncrono
    try {
      await FirebaseAuthentication.signOut(); // Deslogar do Firebase via Capacitor
      await this.auth.signOut(); // Deslogar do Firebase via AngularFire
    } catch (error) {
      console.error('Erro ao deslogar do Firebase:', error);
      // Opcional: mostrar um toast de erro, mas o logout do app ainda deve prosseguir
    }
    this.authService.logout(); // Limpar tokens locais
    this.navCtrl.navigateRoot('/login'); // Navegar para a página de login
  }
}