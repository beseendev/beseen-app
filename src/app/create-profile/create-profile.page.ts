import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonTextarea,
  IonDatetime,
  IonDatetimeButton,
  IonModal
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personCircleOutline, shieldCheckmarkOutline, calendarOutline } from 'ionicons/icons';
import { AuthService, JwtPayload } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-create-profile',
  templateUrl: './create-profile.page.html',
  styleUrls: ['./create-profile.page.scss'],
  standalone: true,
  imports: [
    IonContent, CommonModule, FormsModule, ReactiveFormsModule,
    IonItem, IonInput, IonButton, IonLabel, IonSegment, IonSegmentButton, IonTextarea,
    IonDatetime, IonDatetimeButton, IonModal
  ]
})
export class CreateProfilePage implements OnInit {
  profileForm!: FormGroup;
  userRole: string | null = null;
  isRoleFromToken = false;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);

  constructor() {
    addIcons({ personCircleOutline, shieldCheckmarkOutline, calendarOutline });
  }

  ngOnInit() {
    const decodedToken = this.authService.getDecodedToken<JwtPayload>();
    if (decodedToken && decodedToken.role) {
      this.userRole = decodedToken.role;
      this.isRoleFromToken = true;
    }

    this.profileForm = this.fb.group({
      bio: ['', [Validators.maxLength(500)]],
      position: ['', [Validators.maxLength(100)]],
      height: ['', [Validators.maxLength(20)]],
      weight: ['', [Validators.maxLength(20)]],
      careerHistory: ['', [Validators.maxLength(1000)]],
      documentNumber: ['', [Validators.required]],
      phoneNumber: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(15)]],
      dateOfBirth: [null, [Validators.required]],
      role: [this.userRole, [Validators.required]]
    });

    if (this.isRoleFromToken) {
      this.profileForm.get('role')?.disable();
    }
  }

  submitForm() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const formValue = this.profileForm.getRawValue();
    const formattedDate = this.formatDate(formValue.dateOfBirth);

    const requestData = {
      ...formValue,
      dateOfBirth: formattedDate
    };

    this.profileService.createPlayerProfile(requestData).pipe(
      catchError(err => {
        // Error is already handled by the service's toast, but we prevent it from crashing the app
        console.error(err);
        return of(null);
      })
    ).subscribe(response => {
      if (response) {
        // On success, force a refresh of the user's state and navigate to home
        this.authService.getCurrentUser().subscribe(() => {
          this.router.navigate(['/home']);
        });
      }
    });
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
