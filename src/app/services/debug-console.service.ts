import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DebugConsoleService {
  private static readonly STORAGE_KEY = 'beseen_debug_console';
  private static readonly TAPS_TO_TOGGLE = 7;
  private static readonly TAP_WINDOW_MS = 3000;

  private tapCount = 0;
  private firstTapAt = 0;
  private loaded = false;

  initIfEnabled(): void {
    if (this.isEnabled()) {
      this.load();
    }
  }

  registerTap(): void {
    const now = Date.now();
    if (now - this.firstTapAt > DebugConsoleService.TAP_WINDOW_MS) {
      this.tapCount = 0;
      this.firstTapAt = now;
    }
    this.tapCount++;
    if (this.tapCount >= DebugConsoleService.TAPS_TO_TOGGLE) {
      this.tapCount = 0;
      this.toggle();
    }
  }

  private toggle(): void {
    if (this.isEnabled()) {
      localStorage.removeItem(DebugConsoleService.STORAGE_KEY);
      window.location.reload();
      return;
    }
    localStorage.setItem(DebugConsoleService.STORAGE_KEY, '1');
    this.load();
  }

  private isEnabled(): boolean {
    try {
      return localStorage.getItem(DebugConsoleService.STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private load(): void {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    import('eruda').then(module => {
      const eruda = module.default;
      eruda.init();
      eruda.show();
    }).catch(err => console.error('Error loading debug console', err));
  }
}
