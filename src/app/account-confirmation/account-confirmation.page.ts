import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-account-confirmation',
  templateUrl: './account-confirmation.page.html',
  styleUrls: ['./account-confirmation.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    RouterModule
  ]
})
export class AccountConfirmationPage implements OnInit, OnDestroy {
  confirmationForm: FormGroup;
  userEmail: string = '';

  isCooldownActive = false;
  cooldownSeconds = 60;
  private cooldownTimer: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.userEmail = navigation?.extras?.state?.['email'];

    if (!this.userEmail) {
      this.router.navigate(['/login']);
    }

    this.confirmationForm = this.fb.group({
      code: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(6),
        Validators.pattern(/^[0-9]{6}$/)
      ]]
    });
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    // Clear interval when the component is destroyed to prevent memory leaks
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
  }

  confirmCode() {
    if (this.confirmationForm.invalid) {
      this.confirmationForm.markAllAsTouched();
      return;
    }
    const code = this.confirmationForm.get('code')?.value;
    this.authService.confirmAccountByCode({ email: this.userEmail, code: code }).subscribe({
      next: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  resendCode() {
    if (this.isCooldownActive) {
      return; // Do nothing if cooldown is active
    }

    this.authService.resendConfirmationCode({ email: this.userEmail }).subscribe(() => {
      // Start cooldown on successful API call
      this.isCooldownActive = true;
      this.cooldownSeconds = 60; // Reset timer

      this.cooldownTimer = setInterval(() => {
        this.cooldownSeconds--;
        if (this.cooldownSeconds <= 0) {
          clearInterval(this.cooldownTimer);
          this.isCooldownActive = false;
        }
      }, 1000);
    });
  }
}
