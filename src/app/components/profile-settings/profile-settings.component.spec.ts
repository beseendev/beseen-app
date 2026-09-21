import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActionSheetController, AlertController, ToastController } from '@ionic/angular/standalone';
import { of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { ProfileSettingsComponent } from './profile-settings.component';

describe('ProfileSettingsComponent', () => {
  let component: ProfileSettingsComponent;
  const router = { navigate: jasmine.createSpy('navigate') };
  const auth = { logout: jasmine.createSpy('logout'), getDecodedToken: () => ({ userId: '42' }) };
  const profile = { requestAccountDeletion: jasmine.createSpy('delete').and.returnValue(of({})) };
  const overlay = { present: jasmine.createSpy('present').and.resolveTo() };
  const sheet = { create: jasmine.createSpy('sheet').and.resolveTo(overlay) };
  const alert = { create: jasmine.createSpy('alert').and.resolveTo(overlay) };

  beforeEach(() => {
    for (const spy of [router.navigate, auth.logout, profile.requestAccountDeletion, sheet.create, alert.create]) { spy.calls.reset(); }
    TestBed.configureTestingModule({ providers: [
      { provide: Router, useValue: router }, { provide: AuthService, useValue: auth },
      { provide: ProfileService, useValue: profile }, { provide: ActionSheetController, useValue: sheet },
      { provide: AlertController, useValue: alert }, { provide: ToastController, useValue: sheet }
    ] });
    component = TestBed.runInInjectionContext(() => new ProfileSettingsComponent());
  });

  it('preserves support and blocked users destinations', () => {
    component.navigate('/suporte'); component.navigate('/usuarios-bloqueados');
    expect(router.navigate.calls.allArgs()).toEqual([[['/suporte']], [['/usuarios-bloqueados']]]);
  });

  it('logs out and redirects to login', () => {
    component.logout(); expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  for (const role of ['player', 'scout'] as const) {
    it(`preserves two deletion confirmations for ${role} without deleting on open or cancel`, async () => {
      component.accountType = role;
      await component.openDeleteAccountOptions();
      const first = sheet.create.calls.mostRecent().args[0];
      expect(first.buttons[1].role).toBe('cancel');
      expect(profile.requestAccountDeletion).not.toHaveBeenCalled();
      first.buttons[0].handler();
      const confirmation = alert.create.calls.mostRecent().args[0];
      expect(confirmation.message).toContain(role === 'player' ? 'vídeos' : 'favoritos');
      expect(confirmation.buttons[0].role).toBe('cancel');
      expect(profile.requestAccountDeletion).not.toHaveBeenCalled();
      confirmation.buttons[1].handler();
      expect(profile.requestAccountDeletion).toHaveBeenCalledOnceWith('42');
      expect(auth.logout).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  }
});
