import type { Breadcrumb } from '../types';
import { getBreadcrumbManager } from './BreadcrumbManager';
import { describeElement, getElementSelector, truncateString } from '../utils/serialize';

/**
 * Track click events on the document
 */
export class ClickTracker {
  private enabled = false;
  private handler: ((event: MouseEvent) => void) | null = null;

  /**
   * Start tracking clicks
   */
  start(): void {
    if (this.enabled || typeof document === 'undefined') {
      return;
    }

    this.handler = (event: MouseEvent) => {
      this.handleClick(event);
    };

    document.addEventListener('click', this.handler, {
      capture: true,
      passive: true,
    });

    this.enabled = true;
  }

  /**
   * Stop tracking clicks
   */
  stop(): void {
    if (!this.enabled || !this.handler) {
      return;
    }

    document.removeEventListener('click', this.handler, { capture: true });
    this.handler = null;
    this.enabled = false;
  }

  /**
   * Handle a click event
   */
  private handleClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const manager = getBreadcrumbManager();
    if (!manager) {
      return;
    }

    const breadcrumb: Breadcrumb = {
      type: 'click',
      category: 'ui',
      level: 'info',
      data: {
        element: describeElement(target),
        selector: getElementSelector(target),
      },
    };

    // Add text content for buttons and links
    if (target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement) {
      const text = target.textContent?.trim();
      if (text) {
        breadcrumb.message = `Clicked: "${truncateString(text, 50)}"`;
      }
    }

    // Add href for links
    if (target instanceof HTMLAnchorElement && target.href) {
      breadcrumb.data = {
        ...breadcrumb.data,
        href: target.href,
      };
    }

    manager.add(breadcrumb);
  }
}

// Singleton instance
let instance: ClickTracker | null = null;

export function getClickTracker(): ClickTracker {
  if (!instance) {
    instance = new ClickTracker();
  }
  return instance;
}

export function resetClickTracker(): void {
  if (instance) {
    instance.stop();
    instance = null;
  }
}
