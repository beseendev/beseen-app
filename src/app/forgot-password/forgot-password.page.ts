import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../services/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return newPassword === confirmPassword ? null : { passwordMismatch: true };
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

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      code: [''],
      newPassword: [''],
      confirmPassword: ['']
    });
  }

  ngOnInit() {
  }

  sendCode() {
    if (this.forgotPasswordForm.get('email')?.invalid) {
      return;
    }
    const email = this.forgotPasswordForm.get('email')?.value;

    this.authService.sendPasswordResetCode(email).subscribe(() => {
      this.codeSent = true;
      this.forgotPasswordForm.get('code')?.setValidators([Validators.required]);
      this.forgotPasswordForm.get('newPassword')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.forgotPasswordForm.get('confirmPassword')?.setValidators([Validators.required]);
      this.forgotPasswordForm.setValidators(passwordMatchValidator);
      this.forgotPasswordForm.updateValueAndValidity();
    });
  }

  submitForm() {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }
    const { email, code, newPassword } = this.forgotPasswordForm.value;

    this.authService.resetPassword({ email, code, newPassword }).subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
