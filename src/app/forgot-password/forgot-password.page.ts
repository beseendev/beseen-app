import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

// This validator now correctly checks for a 'password' control.
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    RouterModule
  ]
})
export class ForgotPasswordPage implements OnInit {

  forgotPasswordForm: FormGroup;
  codeSent = false;
  showPassword = false;
  showConfirmPassword = false;
  isSendingCode = false;
  isResetting = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // The form control is now correctly named 'password'.
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      code: [''],
      password: [''],
      confirmPassword: ['']
    });
  }

  ngOnInit() {
  }

  sendCode() {
    if (this.forgotPasswordForm.get('email')?.invalid) {
      return;
    }
    this.isSendingCode = true;
    const email = this.forgotPasswordForm.get('email')?.value;

    this.authService.sendPasswordResetCode(email).pipe(
      finalize(() => this.isSendingCode = false),
      catchError(err => {
        console.error('Send code error:', err);
        return of(null);
      })
    ).subscribe((response) => {
      if (response) {
        this.codeSent = true;
        this.forgotPasswordForm.get('code')?.setValidators([Validators.required]);
        this.forgotPasswordForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
        this.forgotPasswordForm.get('confirmPassword')?.setValidators([Validators.required]);
        this.forgotPasswordForm.setValidators(passwordMatchValidator);
        this.forgotPasswordForm.updateValueAndValidity();
      }
    });
  }

  submitForm() {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }
    this.isResetting = true;
    const { email, code, password } = this.forgotPasswordForm.value;

    this.authService.resetPassword({ email, code, password }).pipe(
      finalize(() => this.isResetting = false),
      catchError(err => {
        console.error('Reset password error:', err);
        return of(null);
      })
    ).subscribe((response) => {
      if (response) {
        this.router.navigate(['/login']);
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
