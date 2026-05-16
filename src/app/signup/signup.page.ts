import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, IonSpinner } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  return password && confirmPassword && password.value !== confirmPassword.value ? { passwordMismatch: true } : null;
};

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, RouterModule]
})
export class SignupPage implements OnInit {
  signupForm!: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  hasReadToBottom = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.signupForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      role: ['JOGADOR', Validators.required],
      acceptedTerms: [false, Validators.requiredTrue]
    }, { validators: passwordMatchValidator });
  }

  onTermsScroll(event: any) {
    const scrollTop = event.detail.scrollTop;

    const target = event.target;
    target.getScrollElement().then((el: HTMLElement) => {
      const scrollHeight = el.scrollHeight;
      const clientHeight = el.clientHeight;

      if (scrollHeight - scrollTop <= clientHeight + 20) {
        this.hasReadToBottom = true;
      }
    });
  }

  resetTermsRead() {
    this.hasReadToBottom = false;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  register() {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const { confirmPassword, ...registrationData } = this.signupForm.value;

    this.authService.register(registrationData).pipe(
      finalize(() => this.isLoading = false),
      catchError(err => {
        console.error('Registration error:', err);
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        if (response) {
          this.router.navigate(['/account-confirmation'], {
            state: { email: registrationData.email }
          });
        }
      }
    });
  }
}
