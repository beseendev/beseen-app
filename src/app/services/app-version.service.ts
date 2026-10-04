import { Injectable, inject, NgZone } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AppUpdate, AppUpdateAvailability } from '@capawesome/capacitor-app-update';
import { environment } from '../../environments/environment';

interface PlatformVersionRule {
  minVersion: string;
  latestVersion: string;
  storeUrl?: string;
}

interface AppConfigResponse {
  android?: PlatformVersionRule;
  ios?: PlatformVersionRule;
}

@Injectable({ providedIn: 'root' })
export class AppVersionService {
  private readonly alertController = inject(AlertController);
  private readonly ngZone = inject(NgZone);

  private static readonly MIN_CHECK_INTERVAL_MS = 15 * 60 * 1000;
  private static readonly OPTIONAL_LAST_PROMPT_KEY = 'update_optional_last_prompt';
  private static readonly OPTIONAL_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;
  private static readonly REQUEST_TIMEOUT_MS = 8000;

  private lastCheck = 0;
  private alertOpen = false;
  private storeUrl = '';

  init(): void {
    if (!Capacitor.isNativePlatform()) return;
    void this.check();
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) this.ngZone.run(() => void this.check());
    });
  }

  private async check(): Promise<void> {
    const now = Date.now();
    if (this.alertOpen || now - this.lastCheck < AppVersionService.MIN_CHECK_INTERVAL_MS) return;
    this.lastCheck = now;

    try {
      const platform = Capacitor.getPlatform() as 'android' | 'ios';
      const [config, info] = await Promise.all([this.fetchConfig(), CapacitorApp.getInfo()]);
      const rule = config[platform];
      if (!rule) return;
      this.storeUrl = rule.storeUrl ?? '';

      if (rule.minVersion && AppVersionService.compare(info.version, rule.minVersion) < 0) {
        await this.showUpdateAlert(true);
      } else if (rule.latestVersion && AppVersionService.compare(info.version, rule.latestVersion) < 0) {
        const last = Number(this.safeGet(AppVersionService.OPTIONAL_LAST_PROMPT_KEY)) || 0;
        if (now - last < AppVersionService.OPTIONAL_INTERVAL_MS) return;
        this.safeSet(AppVersionService.OPTIONAL_LAST_PROMPT_KEY, String(now));
        await this.showUpdateAlert(false);
      }
    } catch (error) {
      this.lastCheck = 0;
      console.warn('Falha ao verificar versão do app', error);
    }
  }

  private async fetchConfig(): Promise<AppConfigResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AppVersionService.REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${environment.apiUrl}/app-config`, { signal: controller.signal });
      if (!response.ok) throw new Error(`app-config HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  private async showUpdateAlert(mandatory: boolean): Promise<void> {
    this.alertOpen = true;
    const alert = await this.alertController.create({
      header: mandatory ? 'Atualização necessária' : 'Nova versão disponível',
      message: mandatory
        ? 'Esta versão do BeSeen não é mais suportada. Atualize para continuar usando o app.'
        : 'Há uma versão nova do BeSeen com melhorias e correções. Deseja atualizar agora?',
      cssClass: 'be-alert-confirm',
      backdropDismiss: false,
      keyboardClose: false,
      buttons: [
        ...(mandatory ? [] : [{
          text: 'Agora não',
          role: 'cancel'
        }]),
        {
          text: 'Atualizar',
          handler: () => {
            void this.openUpdate();
            return !mandatory;
          }
        }
      ]
    });
    await alert.present();
    await alert.onDidDismiss();
    this.alertOpen = false;
  }

  private async openUpdate(): Promise<void> {
    try {
      if (Capacitor.getPlatform() === 'android') {
        const info = await AppUpdate.getAppUpdateInfo();
        if (info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE && info.immediateUpdateAllowed) {
          await AppUpdate.performImmediateUpdate();
          return;
        }
      }
      await this.openStore();
    } catch (error) {
      console.warn('Falha ao abrir atualização', error);
      await this.openStore().catch(() => undefined);
    }
  }

  private async openStore(): Promise<void> {
    if (this.storeUrl) {
      window.open(this.storeUrl, '_system');
      return;
    }
    await AppUpdate.openAppStore(
      Capacitor.getPlatform() === 'ios' ? { appId: environment.iosAppStoreId } : undefined
    );
  }

  static compare(a: string, b: string): number {
    const parse = (v: string) => v.split(/[.-]/).slice(0, 3).map(n => parseInt(n, 10) || 0);
    const pa = parse(a);
    const pb = parse(b);
    for (let i = 0; i < 3; i++) {
      const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  private safeGet(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  private safeSet(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch {}
  }
}
