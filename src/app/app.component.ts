import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  personCircleOutline,
  settingsOutline,
  homeOutline,
  arrowBackOutline,
  menuOutline,
  closeOutline,
  eyeOutline,
  eyeOffOutline,
  mailOutline,
  lockClosedOutline,
  personOutline,
  logoGoogle,
  logoFacebook,
  logoTwitter, shieldCheckmarkOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    addIcons({
      logOutOutline,
      personCircleOutline,
      settingsOutline,
      homeOutline,
      arrowBackOutline,
      menuOutline,
      closeOutline,
      eyeOutline,
      eyeOffOutline,
      mailOutline,
      lockClosedOutline,
      personOutline,
      logoGoogle,
      logoFacebook,
      logoTwitter,
      shieldCheckmarkOutline
    });
  }
}
