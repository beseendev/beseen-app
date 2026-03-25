import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { profileGuard } from './guards/profile-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
    canActivate: [authGuard, profileGuard]
  },
  {
    path: '',
    redirectTo: 'home',
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
    path: 'profile-selection',
    loadComponent: () => import('./profile-selection/profile-selection.page').then(m => m.ProfileSelectionPage),
    canActivate: [authGuard]
  },
  {
    path: 'create-profile-player',
    loadComponent: () => import('./create-profile-player/create-profile-player.page').then(m => m.CreateProfilePlayerPage),
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile.page').then(m => m.ProfilePage),
    canActivate: [authGuard]
  },
  {
    path: 'profile/:userId',
    loadComponent: () => import('./profile/profile.page').then(m => m.ProfilePage),
    canActivate: [authGuard]
  },
  {
    path: 'create-post',
    loadComponent: () => import('./create-post/create-post.page').then(m => m.CreatePostPage),
    canActivate: [authGuard]
  },
  {
    path: 'create-profile-scout',
    loadComponent: () => import('./create-profile-scout/create-profile-scout.page').then(m => m.CreateProfileScoutPage)
  },
  {
    path: 'scout-home',
    loadComponent: () => import('./scout-home/scout-home.page').then(m => m.ScoutHomePage)
  },
];
