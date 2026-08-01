import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { profileGuard } from './guards/profile-guard';
import { subscriptionGuard } from './guards/subscription.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'player-home',
    loadComponent: () => import('./player-home/player-home.page').then(m => m.PlayerHomePage),
    canActivate: [authGuard, profileGuard, subscriptionGuard]
  },
  {
    path: '',
    redirectTo: 'player-home',
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
    path: 'profile-player',
    loadComponent: () => import('./profile-player/profile-player.page').then(m => m.ProfilePlayerPage),
    canActivate: [authGuard, subscriptionGuard]
  },
  {
    path: 'profile-player/:userId',
    loadComponent: () => import('./profile-player/profile-player.page').then(m => m.ProfilePlayerPage),
    canActivate: [authGuard, subscriptionGuard]
  },
  {
    path: 'create-post',
    loadComponent: () => import('./create-post/create-post.page').then(m => m.CreatePostPage),
    canActivate: [authGuard, subscriptionGuard]
  },
  {
    path: 'create-profile-scout',
    loadComponent: () => import('./create-profile-scout/create-profile-scout.page').then(m => m.CreateProfileScoutPage),
    canActivate: [authGuard]
  },
  {
    path: 'profile-scout',
    loadComponent: () => import('./profile-scout/profile-scout.page').then(m => m.ProfileScoutPage),
    canActivate: [authGuard, profileGuard, subscriptionGuard]
  },
  {
    path: 'profile-scout/:userId',
    loadComponent: () => import('./profile-scout/profile-scout.page').then(m => m.ProfileScoutPage),
    canActivate: [authGuard, subscriptionGuard]
  },
  {
    path: 'scout-home',
    loadComponent: () => import('./scout-home/scout-home.page').then(m => m.ScoutHomePage),
    canActivate: [authGuard, profileGuard, subscriptionGuard]
  },
  {
    path: 'scout-athlete-search',
    loadComponent: () => import('./scout-athlete-search/scout-athlete-search.page').then(m => m.ScoutAthleteSearchPage),
    canActivate: [authGuard, profileGuard, subscriptionGuard]
  },
  {
    path: 'suporte',
    loadComponent: () => import('./support/support.page').then(m => m.SupportPage),
    canActivate: [authGuard]
  },
  {
    path: 'usuarios-bloqueados',
    loadComponent: () => import('./blocked-users/blocked-users.page').then(m => m.BlockedUsersPage),
    canActivate: [authGuard]
  },
];
