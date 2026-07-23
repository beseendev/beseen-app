import { Directive, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';

@Directive({
  selector: 'video[appViewportVideoPlayer]',
  standalone: true,
  exportAs: 'appViewportVideoPlayer'
})
export class ViewportVideoPlayerDirective implements OnInit, OnDestroy {
  private static instances = new Set<ViewportVideoPlayerDirective>();
  private static appStateListenerRefCount = 0;
  private static appStateListenerHandle?: Promise<PluginListenerHandle>;
  private static gestureUnlockRegistered = false;

  private observer?: IntersectionObserver;
  private pulseTimer?: ReturnType<typeof setTimeout>;
  private isActive = false;

  isLoading = true;
  hasError = false;
  isPaused = true;
  isMuted = true;
  showPulse = false;

  constructor(private readonly elementRef: ElementRef<HTMLVideoElement>) {}

  ngOnInit(): void {
    ViewportVideoPlayerDirective.instances.add(this);
    ViewportVideoPlayerDirective.acquireAppStateListener();
    ViewportVideoPlayerDirective.registerGestureUnlock();

    const video = this.video;
    video.muted = true;
    video.playsInline = true;
    video.preload = video.preload || 'metadata';

    this.observer = new IntersectionObserver(entries => {
      const entry = entries[0];
      this.isActive = !!entry?.isIntersecting && entry.intersectionRatio >= 0.65;

      if (this.isActive) {
        this.play();
      } else {
        this.pause();
      }
    }, {
      threshold: [0, 0.35, 0.65, 0.85],
      rootMargin: '-8% 0px -8% 0px'
    });

    this.observer.observe(video);
  }

  ngOnDestroy(): void {
    this.pause();
    this.observer?.disconnect();
    ViewportVideoPlayerDirective.instances.delete(this);
    ViewportVideoPlayerDirective.releaseAppStateListener();

    if (this.pulseTimer) {
      clearTimeout(this.pulseTimer);
    }
  }

  @HostListener('click', ['$event'])
  togglePlayback(event?: Event): void {
    event?.stopPropagation();

    if (this.hasError) {
      return;
    }

    if (this.video.paused) {
      this.play();
    } else {
      this.pause();
    }

    this.flashPulse();
  }

  @HostListener('loadeddata')
  @HostListener('canplay')
  onReady(): void {
    this.isLoading = false;
    this.hasError = false;
  }

  @HostListener('waiting')
  onWaiting(): void {
    if (this.isActive) {
      this.isLoading = true;
    }
  }

  @HostListener('playing')
  onPlaying(): void {
    this.isLoading = false;
    this.isPaused = false;
  }

  @HostListener('pause')
  onPause(): void {
    this.isPaused = true;
  }

  @HostListener('error')
  onError(): void {
    this.isLoading = false;
    this.hasError = true;
    this.isPaused = true;
  }

  toggleMute(event?: Event): void {
    event?.stopPropagation();
    this.video.muted = !this.video.muted;
    this.isMuted = this.video.muted;
  }

  retry(event?: Event): void {
    event?.stopPropagation();

    this.hasError = false;
    this.isLoading = true;
    this.video.load();

    if (this.isActive) {
      this.play();
    }
  }

  /**
   * Chamado quando o app volta do background. O WKWebView do iOS costuma
   * descartar o buffer decodificado do vídeo enquanto o app está minimizado,
   * deixando o elemento "congelado" num frame cinza mesmo depois do play() -
   * por isso força um reload antes de tocar quando o buffer não está mais válido.
   */
  private resume(): void {
    if (!this.isActive || this.hasError) {
      return;
    }

    if (this.video.readyState < 2) {
      this.isLoading = true;
      this.video.load();
    }

    this.play();
  }

  private play(): void {
    if (this.hasError) {
      return;
    }

    ViewportVideoPlayerDirective.instances.forEach(instance => {
      if (instance !== this) {
        instance.pause();
      }
    });

    this.video.play()
      .then(() => {
        this.isPaused = false;
        this.isLoading = false;
      })
      .catch(() => {
        this.isPaused = true;
      });
  }

  private pause(): void {
    this.video.pause();
    this.isPaused = true;
  }

  private flashPulse(): void {
    this.showPulse = true;

    if (this.pulseTimer) {
      clearTimeout(this.pulseTimer);
    }

    this.pulseTimer = setTimeout(() => {
      this.showPulse = false;
    }, 380);
  }

  private get video(): HTMLVideoElement {
    return this.elementRef.nativeElement;
  }

  /**
   * No WKWebView do iOS (Capacitor), depois de um cold start o carregamento e a
   * renderização de vídeo ficam suspensos até o primeiro gesto real do usuário na
   * página - scroll não conta como gesto. Sem isso, play() chamado pelo
   * IntersectionObserver fica preso em "waiting" mesmo com o vídeo em tela.
   * Captura o primeiro toque em qualquer lugar do app (não precisa ser no vídeo)
   * para destravar e tentar tocar o vídeo ativo no momento.
   */
  private static registerGestureUnlock(): void {
    if (ViewportVideoPlayerDirective.gestureUnlockRegistered) {
      return;
    }

    ViewportVideoPlayerDirective.gestureUnlockRegistered = true;

    let unlocked = false;
    const unlock = () => {
      if (unlocked) {
        return;
      }

      unlocked = true;
      document.removeEventListener('touchend', unlock, true);
      document.removeEventListener('click', unlock, true);

      ViewportVideoPlayerDirective.instances.forEach(instance => {
        if (instance.isActive) {
          instance.play();
        }
      });
    };

    document.addEventListener('touchend', unlock, { capture: true, passive: true });
    document.addEventListener('click', unlock, { capture: true });
  }

  private static acquireAppStateListener(): void {
    ViewportVideoPlayerDirective.appStateListenerRefCount++;

    if (ViewportVideoPlayerDirective.appStateListenerHandle) {
      return;
    }

    ViewportVideoPlayerDirective.appStateListenerHandle = App.addListener('appStateChange', ({ isActive }) => {
      ViewportVideoPlayerDirective.instances.forEach(instance => {
        if (isActive) {
          instance.resume();
        } else {
          instance.pause();
        }
      });
    });
  }

  private static releaseAppStateListener(): void {
    ViewportVideoPlayerDirective.appStateListenerRefCount--;

    if (ViewportVideoPlayerDirective.appStateListenerRefCount > 0) {
      return;
    }

    ViewportVideoPlayerDirective.appStateListenerRefCount = 0;
    const handle = ViewportVideoPlayerDirective.appStateListenerHandle;
    ViewportVideoPlayerDirective.appStateListenerHandle = undefined;
    handle?.then(listener => listener.remove());
  }
}
