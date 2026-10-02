import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { ModalController } from '@ionic/angular/standalone';
import { BehaviorSubject, Subject } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { BottomNavigationComponent } from './bottom-navigation.component';
import { DefaultUrlSerializer } from '@angular/router';

describe('BottomNavigationComponent', () => {
  let component: BottomNavigationComponent;
  let role: BehaviorSubject<string | null>;
  let events: Subject<NavigationEnd>;
  let router: { url: string; events: Subject<NavigationEnd>; parseUrl: (url: string) => unknown; navigate: jasmine.Spy; navigateByUrl: jasmine.Spy };
  let modal: { present: jasmine.Spy; onDidDismiss: jasmine.Spy };
  let createModal: jasmine.Spy;

  beforeEach(() => {
    role = new BehaviorSubject<string | null>('JOGADOR');
    events = new Subject<NavigationEnd>();
    router = { url: '/player-home', events, parseUrl: url => new DefaultUrlSerializer().parse(url), navigate: jasmine.createSpy('navigate'), navigateByUrl: jasmine.createSpy('navigateByUrl') };
    modal = { present: jasmine.createSpy('present').and.resolveTo(), onDidDismiss: jasmine.createSpy('onDidDismiss').and.resolveTo({}) };
    createModal = jasmine.createSpy('create').and.resolveTo(modal);
    TestBed.configureTestingModule({ providers: [
      { provide: Router, useValue: router },
      { provide: AuthService, useValue: { userRole$: role } },
      { provide: ChatService, useValue: { pendingInvitesCount$: new BehaviorSubject(2) } },
      { provide: ModalController, useValue: { create: createModal } }
    ] });
    component = TestBed.runInInjectionContext(() => new BottomNavigationComponent());
  });
  afterEach(() => component.ngOnDestroy());
  function visit(url: string): void { router.url = url; events.next(new NavigationEnd(1, url, url)); }

  it('keeps publication and onboarding free of social navigation', () => {
    for (const route of ['/login', '/signup', '/forgot-password', '/account-confirmation', '/profile-selection', '/create-profile-player', '/create-profile-scout', '/create-post']) {
      visit(route); expect(component.visible).withContext(route).toBeFalse();
    }
  });
  it('does not label another athlete as My Profile', () => {
    visit('/profile-player/42'); expect(component.visible).toBeTrue(); expect(component.active).toBe('');
    visit('/profile-player'); expect(component.active).toBe('profile');
  });
  it('routes the two roles to their own home and profile', () => {
    component.navigate('profile'); expect(router.navigateByUrl).toHaveBeenCalledWith('/profile-player');
    role.next('CLUBE'); component.navigate('home'); component.navigate('profile');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/scout-home');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/profile-scout');
  });
  it('uses the existing scout home for Favorites and clears that selection on Home', () => {
    role.next('CLUBE'); component.navigate('favorites');
    expect(router.navigate).toHaveBeenCalledWith(['/scout-home'], { queryParams: { tab: 'favoritos' } });
    visit('/scout-home?tab=favoritos'); expect(component.active).toBe('favorites');
    visit('/scout-home'); expect(component.active).toBe('home');
  });
  it('reuses the invitations sheet with its existing presentation', async () => {
    await component.openInvites();
    expect(createModal).toHaveBeenCalledWith(jasmine.objectContaining({ initialBreakpoint: 0.8, cssClass: 'invites-modal-sheet', componentProps: { postId: undefined } }));
    expect(modal.present).toHaveBeenCalled();
  });
  it('releases the navigation inset while an input has focus', () => {
    const input = document.createElement('input');
    component.onFocus({ target: input } as unknown as FocusEvent);
    expect(component.visible).toBeFalse();
    component.onBlur(); expect(component.visible).toBeTrue();
    role.next(null); expect(component.visible).toBeFalse();
  });
});
