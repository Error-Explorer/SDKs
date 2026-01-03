import type { Breadcrumb } from '../types';
import { getBreadcrumbManager } from './BreadcrumbManager';
import { getElementSelector } from '../utils/serialize';

/**
 * Track input focus events (NOT values - privacy first!)
 */
export class InputTracker {
  private enabled = false;
  private focusHandler: ((event: FocusEvent) => void) | null = null;
  private blurHandler: ((event: FocusEvent) => void) | null = null;

  /**
   * Start tracking input events
   */
  start(): void {
    if (this.enabled || typeof document === 'undefined') {
      return;
    }

    this.focusHandler = (event: FocusEvent) => {
      this.handleFocus(event);
    };

    this.blurHandler = (event: FocusEvent) => {
      this.handleBlur(event);
    };

    // Use capture phase to catch all focus/blur events
    document.addEventListener('focus', this.focusHandler, { capture: true, passive: true });
    document.addEventListener('blur', this.blurHandler, { capture: true, passive: true });

    this.enabled = true;
  }

  /**
   * Stop tracking input events
   */
  stop(): void {
    if (!this.enabled) {
      return;
    }

    if (this.focusHandler) {
      document.removeEventListener('focus', this.focusHandler, { capture: true });
      this.focusHandler = null;
    }

    if (this.blurHandler) {
      document.removeEventListener('blur', this.blurHandler, { capture: true });
      this.blurHandler = null;
    }

    this.enabled = false;
  }

  /**
   * Handle focus event
   */
  private handleFocus(event: FocusEvent): void {
    const target = event.target;
    if (!this.isTrackedElement(target)) {
      return;
    }

    this.recordBreadcrumb(target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, 'focus');
  }

  /**
   * Handle blur event
   */
  private handleBlur(event: FocusEvent): void {
    const target = event.target;
    if (!this.isTrackedElement(target)) {
      return;
    }

    this.recordBreadcrumb(target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, 'blur');
  }

  /**
   * Check if element should be tracked
   */
  private isTrackedElement(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
    if (!target) {
      return false;
    }

    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    );
  }

  /**
   * Record an input breadcrumb
   */
  private recordBreadcrumb(
    element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    action: 'focus' | 'blur'
  ): void {
    const manager = getBreadcrumbManager();
    if (!manager) {
      return;
    }

    const inputType = element instanceof HTMLInputElement ? element.type : element.tagName.toLowerCase();
    const name = element.name || element.id || undefined;

    const breadcrumb: Breadcrumb = {
      type: 'input',
      category: 'ui',
      level: 'info',
      message: `Input ${action}: ${inputType}${name ? ` (${name})` : ''}`,
      data: {
        action,
        element_type: inputType,
        name,
        selector: getElementSelector(element),
        // NEVER include the actual value for privacy!
      },
    };

    manager.add(breadcrumb);
  }
}

// Singleton instance
let instance: InputTracker | null = null;

export function getInputTracker(): InputTracker {
  if (!instance) {
    instance = new InputTracker();
  }
  return instance;
}

export function resetInputTracker(): void {
  if (instance) {
    instance.stop();
    instance = null;
  }
}
