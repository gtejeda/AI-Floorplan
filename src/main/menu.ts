import { app, Menu, shell, BrowserWindow } from 'electron';
import path from 'path';
import { getRecentProjects } from './settings-store';

/**
 * Creates the application menu
 * @param mainWindow The main browser window
 */
export function createApplicationMenu(mainWindow: BrowserWindow): void {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    // App Menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              {
                label: 'Settings...',
                accelerator: 'Cmd+,',
                click: () => {
                  mainWindow.webContents.send('menu:settings');
                }
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),

    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu:new-project');
          }
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu:open-project');
          }
        },
        { type: 'separator' },
        // Recent Projects submenu
        ...(() => {
          const recentProjects = getRecentProjects();
          if (recentProjects.length > 0) {
            return [
              {
                label: 'Open Recent',
                submenu: [
                  ...recentProjects.map((projectPath, index) => {
                    const projectName = path.basename(projectPath);
                    return {
                      label: projectName,
                      sublabel: projectPath,
                      accelerator: index < 9 ? `CmdOrCtrl+${index + 1}` : undefined,
                      click: () => {
                        mainWindow.webContents.send('menu:open-recent-project', projectPath);
                      }
                    };
                  }),
                  { type: 'separator' as const },
                  {
                    label: 'Clear Recent Projects',
                    click: () => {
                      mainWindow.webContents.send('menu:clear-recent-projects');
                    }
                  }
                ]
              },
              { type: 'separator' as const }
            ];
          }
          return [];
        })(),
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu:save');
          }
        },
        { type: 'separator' },
        {
          label: 'Export Project...',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('menu:export');
          }
        },
        {
          label: 'Import Project...',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow.webContents.send('menu:import');
          }
        },
        { type: 'separator' },
        ...(isMac
          ? [
              { role: 'close' as const }
            ]
          : [
              {
                label: 'Settings...',
                accelerator: 'Ctrl+,',
                click: () => {
                  mainWindow.webContents.send('menu:settings');
                }
              },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ])
      ]
    },

    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
              { type: 'separator' as const },
              {
                label: 'Speech',
                submenu: [
                  { role: 'startSpeaking' as const },
                  { role: 'stopSpeaking' as const }
                ]
              }
            ]
          : [
              { role: 'delete' as const },
              { type: 'separator' as const },
              { role: 'selectAll' as const }
            ])
      ]
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },

    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const }
            ]
          : [
              { role: 'close' as const }
            ])
      ]
    },

    // Help Menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Documentation',
          accelerator: 'CmdOrCtrl+/',
          click: async () => {
            const quickstartPath = path.join(__dirname, '../../specs/main/quickstart.md');
            try {
              await shell.openPath(quickstartPath);
            } catch (error) {
              console.error('Failed to open quickstart:', error);
              mainWindow.webContents.send('menu:help-error', 'Could not open documentation');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'About Micro Villas',
          click: () => {
            mainWindow.webContents.send('menu:about');
          }
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://github.com/microvillas/platform/issues');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Refresh the application menu
 * Useful when recent projects list changes
 * @param mainWindow The main browser window
 */
export function refreshApplicationMenu(mainWindow: BrowserWindow): void {
  createApplicationMenu(mainWindow);
}

export default createApplicationMenu;
