import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MobileDetectionService {
  private _isMobile: boolean;

  constructor() {
    this._isMobile = this.detectMobile();

    // Listen for resize events to update mobile detection
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        this._isMobile = this.detectMobile();
      });
    }
  }

  private detectMobile(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    // Check for touch support
    const hasTouchScreen = 'ontouchstart' in window ||
                          navigator.maxTouchPoints > 0;

    // Check screen width (typically mobile devices are <= 768px)
    const isSmallScreen = window.innerWidth <= 768;

    // Check user agent for mobile devices
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileUserAgent = mobileRegex.test(navigator.userAgent);

    // Consider it mobile if it has touch AND (small screen OR mobile user agent)
    return hasTouchScreen && (isSmallScreen || isMobileUserAgent);
  }

  public get isMobile(): boolean {
    return this._isMobile;
  }

  public get isTouch(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
}
