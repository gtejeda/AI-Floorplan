/**
 * Global TypeScript declarations
 * Declares the window.electronAPI interface for renderer process
 */

import { ElectronAPI } from '../preload/index';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
