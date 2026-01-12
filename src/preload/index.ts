/**
 * Electron Preload Script
 * Exposes safe IPC methods to renderer process via contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * Electron API exposed to renderer process
 */
const electronAPI = {
  // Project operations
  createProject: (input: { name: string; notes?: string }) => ipcRenderer.invoke('project:create', input),
  loadProject: (id: string) => ipcRenderer.invoke('project:load', id),
  listProjects: () => ipcRenderer.invoke('project:list'),
  
  // Land parcel operations
  saveLandParcel: (data: any) => ipcRenderer.invoke('land:save', data),
  updateLandParcel: (id: string, data: any) => ipcRenderer.invoke('land:update', id, data),
  loadLandParcel: (id: string) => ipcRenderer.invoke('land:load', id),
  
  // Subdivision operations
  calculateSubdivisions: (landParcelId: string, options?: any) => ipcRenderer.invoke('subdivision:calculate', landParcelId, options),
  selectScenario: (projectId: string, scenarioId: string) => ipcRenderer.invoke('subdivision:select', projectId, scenarioId),
  
  // Social club operations
  getAmenitiesCatalog: () => ipcRenderer.invoke('amenities:catalog'),
  saveSocialClubDesign: (data: any) => ipcRenderer.invoke('socialclub:save', data),
  
  // Financial operations
  saveFinancialAnalysis: (data: any) => ipcRenderer.invoke('financial:save', data),
  loadFinancialAnalysis: (projectId: string) => ipcRenderer.invoke('financial:load', projectId),
  recalculateFinancials: (projectId: string) => ipcRenderer.invoke('financial:recalculate', projectId),
  
  // AI integration
  generateSubdivisionPrompt: (projectId: string, targetDirectory: string) => ipcRenderer.invoke('ai:generateSubdivisionPrompt', projectId, targetDirectory),
  generateImagePrompts: (projectId: string, targetDirectory: string) => ipcRenderer.invoke('ai:generateImagePrompts', projectId, targetDirectory),
  importOptimizedSubdivision: (filePath: string) => ipcRenderer.invoke('ai:importOptimizedSubdivision', filePath),
  
  // Image operations (T152)
  selectImages: () => ipcRenderer.invoke('dialog:selectImages'),
  attachImagesToLand: (data: { projectId: string; filePaths: string[]; captions?: string[] }) => ipcRenderer.invoke('images:attachToLand', data),
  attachImagesToLot: (data: { projectId: string; lotId: string; filePaths: string[]; captions?: string[] }) => ipcRenderer.invoke('images:attachToLot', data),
  getImageThumbnail: (imageId: string) => ipcRenderer.invoke('images:getThumbnail', imageId),
  importAIGeneratedImages: (data: { projectId: string; targetDirectory: string }) => ipcRenderer.invoke('images:importAIGenerated', data),
  getImagesByProject: (projectId: string) => ipcRenderer.invoke('images:getByProject', projectId),
  
  // Export/Import operations (T172)
  selectExportDirectory: () => ipcRenderer.invoke('dialog:selectExportDir'),
  exportProject: (data: { projectId: string; targetDirectory: string }) => ipcRenderer.invoke('export:project', data),
  selectImportDirectory: () => ipcRenderer.invoke('dialog:selectImportDir'),
  importProject: (sourceDir: string) => ipcRenderer.invoke('import:project', sourceDir),

  // Recent Projects operations (T207)
  getRecentProjects: () => ipcRenderer.invoke('recent-projects:get'),
  addRecentProject: (projectPath: string) => ipcRenderer.invoke('recent-projects:add', projectPath),
  clearRecentProjects: () => ipcRenderer.invoke('recent-projects:clear'),
  removeRecentProject: (projectPath: string) => ipcRenderer.invoke('recent-projects:remove', projectPath),

  // Menu event listeners (T207)
  onOpenRecentProject: (callback: (projectPath: string) => void) => {
    ipcRenderer.on('menu:open-recent-project', (event, projectPath) => callback(projectPath));
  },
  onClearRecentProjects: (callback: () => void) => {
    ipcRenderer.on('menu:clear-recent-projects', () => callback());
  },
  onMenuNewProject: (callback: () => void) => {
    ipcRenderer.on('menu:new-project', () => callback());
  },
  onMenuSave: (callback: () => void) => {
    ipcRenderer.on('menu:save', () => callback());
  },
  onMenuExport: (callback: () => void) => {
    ipcRenderer.on('menu:export', () => callback());
  },
  onMenuImport: (callback: () => void) => {
    ipcRenderer.on('menu:import', () => callback());
  },
  onMenuOpenProject: (callback: () => void) => {
    ipcRenderer.on('menu:open-project', () => callback());
  },

  // Telemetry operations (T219)
  telemetry: {
    isEnabled: () => ipcRenderer.invoke('telemetry:isEnabled'),
    enable: () => ipcRenderer.invoke('telemetry:enable'),
    disable: () => ipcRenderer.invoke('telemetry:disable'),
    getStatistics: () => ipcRenderer.invoke('telemetry:getStatistics'),
    getRecentEvents: () => ipcRenderer.invoke('telemetry:getRecentEvents'),
    clearData: () => ipcRenderer.invoke('telemetry:clearData'),
    trackEvent: (eventType: string, eventName: string, data?: Record<string, any>) =>
      ipcRenderer.invoke('telemetry:trackEvent', eventType, eventName, data)
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
