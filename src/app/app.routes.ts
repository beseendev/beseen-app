import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { profileGuard } from './guards/profile-guard'; // Importar o novo guard

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
    canActivate: [authGuard, profileGuard] // Adicionar o profileGuard aqui
  },
  {
    path: '',
    redirectTo: 'home', // Redirecionar para home para que os guards sejam aplicados
    pathMatch: 'full'
  },
  {
    path: 'signup',
    loadComponent: () => import('./signup/signup.page').then( m => m.SignupPage)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password/forgot-password.page').then( m => m.ForgotPasswordPage)
  },
  {
    path: 'account-confirmation',
    loadComponent: () => import('./account-confirmation/account-confirmation.page').then( m => m.AccountConfirmationPage)
  },
  {
    path: 'create-profile',
    loadComponent: () => import('./create-profile/create-profile.page').then(m => m.CreateProfilePage),
    canActivate: [authGuard] // Proteger a rota de criação de perfil
  },
];
