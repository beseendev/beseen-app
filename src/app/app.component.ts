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
  logoTwitter, shieldCheckmarkOutline, resizeOutline, listOutline, barbellOutline, idCardOutline, documentTextOutline,
  callOutline, linkOutline, briefcaseOutline, businessOutline, logoWhatsapp, footballOutline, locationOutline,
  peopleOutline, mapOutline, ellipsisHorizontalOutline, searchOutline, globeOutline, starOutline
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
      shieldCheckmarkOutline,
      resizeOutline,
      barbellOutline,
      listOutline,
      documentTextOutline,
      idCardOutline,
      callOutline,
      linkOutline,
      briefcaseOutline,
      businessOutline,
      logoWhatsapp,
      locationOutline,
      footballOutline,
      peopleOutline,
      mapOutline,
      ellipsisHorizontalOutline,
      globeOutline,
      searchOutline,
      starOutline
    });
  }
}
