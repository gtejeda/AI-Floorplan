/**
 * Electron Main Process Entry Point
 * Micro Villas Investment Platform
 */

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { initializeDatabase } from './storage';
import { createApplicationMenu } from './menu';
import './ipc-handlers';

let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  // Preload script path (built by Electron Forge Vite plugin)
  const preloadPath = path.join(__dirname, 'index.js');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    },
    title: 'Micro Villas Investment Platform',
    show: false
  });

  // Create application menu
  createApplicationMenu(mainWindow);

  // Load renderer
  // In dev mode, __dirname will be .vite/build, and Vite server runs on port from console
  const isDev = __dirname.includes('.vite');

  if (isDev) {
    // Development mode - use Vite dev server
    // Read the port from the environment or use default
    const port = process.env.VITE_DEV_SERVER_PORT || '5173';
    const devUrl = `http://localhost:${port}`;
    console.log('[Main] Loading dev server:', devUrl);
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode - load from file
    const indexPath = path.join(__dirname, '../renderer/main_window/index.html');
    console.log('[Main] Loading production file:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// Track app launch performance (T211)
const appStartTime = Date.now();

app.whenReady().then(() => {
  const readyTime = Date.now() - appStartTime;

  try {
    initializeDatabase();
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }

  createWindow();

  // Log launch performance after window is shown
  mainWindow?.once('ready-to-show', () => {
    const launchTime = Date.now() - appStartTime;

    if (launchTime > 3000) {
      console.warn(
        `[Performance] App launch took ${launchTime}ms (target: <3000ms). Ready at: ${readyTime}ms`
      );
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
