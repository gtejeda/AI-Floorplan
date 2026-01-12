import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  handler: () => void;
  description: string;
}

/**
 * Hook to register keyboard shortcuts
 * @param shortcuts Array of keyboard shortcut configurations
 * @param enabled Whether shortcuts are currently enabled
 */
export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
): void => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, enabled]);
};

/**
 * Global keyboard shortcuts for the application
 */
export const globalShortcuts: KeyboardShortcut[] = [
  {
    key: 's',
    ctrl: true,
    handler: () => {
      // Save will be handled by active component
      const event = new CustomEvent('app:save');
      window.dispatchEvent(event);
    },
    description: 'Save current project'
  },
  {
    key: 'e',
    ctrl: true,
    handler: () => {
      const event = new CustomEvent('app:export');
      window.dispatchEvent(event);
    },
    description: 'Export project'
  },
  {
    key: 'i',
    ctrl: true,
    handler: () => {
      const event = new CustomEvent('app:import');
      window.dispatchEvent(event);
    },
    description: 'Import project'
  },
  {
    key: 'n',
    ctrl: true,
    handler: () => {
      const event = new CustomEvent('app:new');
      window.dispatchEvent(event);
    },
    description: 'New project'
  },
  {
    key: 'o',
    ctrl: true,
    handler: () => {
      const event = new CustomEvent('app:open');
      window.dispatchEvent(event);
    },
    description: 'Open project'
  },
  {
    key: ',',
    ctrl: true,
    handler: () => {
      const event = new CustomEvent('app:settings');
      window.dispatchEvent(event);
    },
    description: 'Open settings'
  },
  {
    key: '/',
    ctrl: true,
    handler: () => {
      const event = new CustomEvent('app:help');
      window.dispatchEvent(event);
    },
    description: 'Show help'
  }
];

export default useKeyboardShortcuts;
