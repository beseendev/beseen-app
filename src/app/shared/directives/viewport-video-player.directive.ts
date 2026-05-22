import { Directive, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';

@Directive({
  selector: 'video[appViewportVideoPlayer]',
  standalone: true,
  exportAs: 'appViewportVideoPlayer'
})
export class ViewportVideoPlayerDirective implements OnInit, OnDestroy {
  private static instances = new Set<ViewportVideoPlayerDirective>();

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
}
