/**
 * Global TypeScript declarations
 * Declares the window.electronAPI interface for renderer process
 */

import { ElectronAPI, AIServiceAPI } from '../preload/index';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    aiService: AIServiceAPI;
  }
}

export {};
