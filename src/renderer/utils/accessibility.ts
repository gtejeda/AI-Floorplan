/**
 * Accessibility Utilities
 * Helpers for keyboard navigation and screen reader support
 */

/**
 * Trap focus within a modal/dialog
 * @param element The container element to trap focus within
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  element.addEventListener('keydown', handleTabKey);

  // Focus first element
  firstElement?.focus();

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * Handle Escape key to close modals
 * @param callback Function to call when Escape is pressed
 */
export function handleEscapeKey(callback: () => void): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      callback();
    }
  };

  window.addEventListener('keydown', handleKeyDown);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Announce message to screen readers
 * @param message Message to announce
 * @param priority 'polite' or 'assertive'
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Generate unique ID for form elements
 * @param prefix Prefix for the ID
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get appropriate timeout based on motion preference
 * @param normalTimeout Normal timeout in ms
 * @param reducedTimeout Reduced timeout in ms (default 0)
 */
export function getAccessibleTimeout(
  normalTimeout: number,
  reducedTimeout: number = 0
): number {
  return prefersReducedMotion() ? reducedTimeout : normalTimeout;
}
