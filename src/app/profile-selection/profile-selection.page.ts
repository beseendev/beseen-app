import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { Router, ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-profile-selection',
  templateUrl: './profile-selection.page.html',
  styleUrls: ['./profile-selection.page.scss'],
  standalone: true,
  imports: [
    IonContent, CommonModule, ReactiveFormsModule,
    IonButton, IonIcon, IonLabel, IonSegment, IonSegmentButton
  ]
})
export class ProfileSelectionPage implements OnInit {
  profileForm: FormGroup;
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private toastController = inject(ToastController);
  private navCtrl = inject(NavController);

  idToken: string | null = null;
  loginMethod: string | null = null;

  constructor() {
    addIcons({ arrowBackOutline });
    this.profileForm = this.fb.group({
      role: [null, [Validators.required]]
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.idToken = params['idToken'] || null;
      this.loginMethod = params['loginMethod'] || null;
    });

    this.profileForm.get('role')?.valueChanges.subscribe(role => {
      if (role === 'JOGADOR') {
        this.navigateTo('/create-profile-player', role);
      } else if (role === 'CLUBE') {
        this.navigateTo('/create-profile-scout', role);
      }
    });
  }

  private navigateTo(path: string, role: string) {
    this.navCtrl.navigateRoot(path, {
      queryParams: {
        idToken: this.idToken,
        loginMethod: this.loginMethod,
        role: role
      },
      animated: true,
      animationDirection: 'forward'
    });
  }

  goBack(): void {
    this.location.back();
  }
}
