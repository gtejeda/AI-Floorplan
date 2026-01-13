/**
 * Electron Preload Script
 * Exposes safe IPC methods to renderer process via contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';
import type {
  GenerateSubdivisionPlanRequest,
  GenerateSubdivisionPlanResponse,
  GenerateSitePlanImageRequest,
  GenerateSitePlanImageResponse,
  ApprovePlanRequest,
  ApprovePlanResponse,
  RejectPlanRequest,
  RejectPlanResponse,
  GetGenerationHistoryRequest,
  GetGenerationHistoryResponse,
  GetArchivedPlansRequest,
  GetArchivedPlansResponse,
  SwitchToArchivedPlanRequest,
  SwitchToArchivedPlanResponse,
  GetSessionCostRequest,
  GetSessionCostResponse,
  GetAISettingsRequest,
  GetAISettingsResponse,
  UpdateAISettingsRequest,
  UpdateAISettingsResponse,
  SetAPIKeyRequest,
  SetAPIKeyResponse,
  TestAPIKeyRequest,
  TestAPIKeyResponse,
  AIGenerationProgressEvent,
  AIStreamingProgressEvent,
} from '../shared/ai-contracts';

/**
 * Electron API exposed to renderer process
 */
const electronAPI = {
  // Project operations
  createProject: (input: { name: string; notes?: string }) =>
    ipcRenderer.invoke('project:create', input),
  loadProject: (id: string) => ipcRenderer.invoke('project:load', id),
  listProjects: () => ipcRenderer.invoke('project:list'),

  // Land parcel operations
  saveLandParcel: (data: any) => ipcRenderer.invoke('land:save', data),
  updateLandParcel: (id: string, data: any) => ipcRenderer.invoke('land:update', id, data),
  loadLandParcel: (id: string) => ipcRenderer.invoke('land:load', id),

  // Subdivision operations
  calculateSubdivisions: (landParcelId: string, options?: any) =>
    ipcRenderer.invoke('subdivision:calculate', landParcelId, options),
  selectScenario: (projectId: string, scenarioId: string) =>
    ipcRenderer.invoke('subdivision:select', projectId, scenarioId),

  // Social club operations
  getAmenitiesCatalog: () => ipcRenderer.invoke('amenities:catalog'),
  saveSocialClubDesign: (data: any) => ipcRenderer.invoke('socialclub:save', data),
  loadSocialClubDesign: (projectId: string) => ipcRenderer.invoke('socialclub:load', projectId),

  // Financial operations
  saveFinancialAnalysis: (data: any) => ipcRenderer.invoke('financial:save', data),
  loadFinancialAnalysis: (projectId: string) => ipcRenderer.invoke('financial:load', projectId),
  recalculateFinancials: (projectId: string) =>
    ipcRenderer.invoke('financial:recalculate', projectId),

  // AI integration - Legacy methods
  generateSubdivisionPrompt: (projectId: string, targetDirectory: string) =>
    ipcRenderer.invoke('ai:generateSubdivisionPrompt', projectId, targetDirectory),
  generateImagePrompts: (projectId: string, targetDirectory: string) =>
    ipcRenderer.invoke('ai:generateImagePrompts', projectId, targetDirectory),
  importOptimizedSubdivision: (filePath: string) =>
    ipcRenderer.invoke('ai:importOptimizedSubdivision', filePath),

  // Image operations (T152)
  selectImages: () => ipcRenderer.invoke('dialog:selectImages'),
  attachImagesToLand: (data: { projectId: string; filePaths: string[]; captions?: string[] }) =>
    ipcRenderer.invoke('images:attachToLand', data),
  attachImagesToLot: (data: {
    projectId: string;
    lotId: string;
    filePaths: string[];
    captions?: string[];
  }) => ipcRenderer.invoke('images:attachToLot', data),
  getImageThumbnail: (imageId: string) => ipcRenderer.invoke('images:getThumbnail', imageId),
  importAIGeneratedImages: (data: { projectId: string; targetDirectory: string }) =>
    ipcRenderer.invoke('images:importAIGenerated', data),
  getImagesByProject: (projectId: string) => ipcRenderer.invoke('images:getByProject', projectId),

  // Export/Import operations (T172)
  selectExportDirectory: () => ipcRenderer.invoke('dialog:selectExportDir'),
  exportProject: (data: { projectId: string; targetDirectory: string }) =>
    ipcRenderer.invoke('export:project', data),
  selectImportDirectory: () => ipcRenderer.invoke('dialog:selectImportDir'),
  importProject: (sourceDir: string) => ipcRenderer.invoke('import:project', sourceDir),

  // Recent Projects operations (T207)
  getRecentProjects: () => ipcRenderer.invoke('recent-projects:get'),
  addRecentProject: (projectPath: string) => ipcRenderer.invoke('recent-projects:add', projectPath),
  clearRecentProjects: () => ipcRenderer.invoke('recent-projects:clear'),
  removeRecentProject: (projectPath: string) =>
    ipcRenderer.invoke('recent-projects:remove', projectPath),

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
      ipcRenderer.invoke('telemetry:trackEvent', eventType, eventName, data),
  },
};

/**
 * AI Service API exposed to renderer process
 * Provides type-safe access to AI subdivision planning features
 */
const aiServiceAPI = {
  // Subdivision plan generation
  generateSubdivisionPlan: (
    request: GenerateSubdivisionPlanRequest
  ): Promise<GenerateSubdivisionPlanResponse> =>
    ipcRenderer.invoke('ai:generate-subdivision-plan', request),

  previewSubdivisionPrompt: (
    request: {
      landWidth: number;
      landLength: number;
      landArea: number;
      socialClubPercent: number;
      targetLotCount?: number;
      province?: string;
      strategy?: string;
    }
  ): Promise<{ prompt: string }> =>
    ipcRenderer.invoke('ai:preview-subdivision-prompt', request),

  // Image generation
  generateSitePlanImage: (
    request: GenerateSitePlanImageRequest
  ): Promise<GenerateSitePlanImageResponse> =>
    ipcRenderer.invoke('ai:generate-site-plan-image', request),

  previewImagePrompt: (
    request: GenerateSitePlanImageRequest
  ): Promise<{ prompt: string; viewType: string }> =>
    ipcRenderer.invoke('ai:preview-image-prompt', request),

  // Image generation status and management
  getImageGenerationStatus: (generationId: string): Promise<any> =>
    ipcRenderer.invoke('ai:get-image-generation-status', generationId),

  getProjectVisualizations: (planId: string): Promise<any[]> =>
    ipcRenderer.invoke('ai:get-project-visualizations', planId),

  saveImageToProject: (
    projectId: string,
    planId: string,
    viewType: string,
    imageUrl: string,
    promptText: string,
    negativePromptText?: string
  ): Promise<any> =>
    ipcRenderer.invoke('ai:save-image-to-project', {
      projectId,
      planId,
      viewType,
      imageUrl,
      promptText,
      negativePromptText,
    }),

  approveVisualization: (visualizationId: string): Promise<void> =>
    ipcRenderer.invoke('ai:approve-visualization', visualizationId),

  loadImageAsDataUrl: (localPath: string): Promise<string> =>
    ipcRenderer.invoke('ai:load-image-as-data-url', localPath),

  // Plan management
  approvePlan: (request: ApprovePlanRequest): Promise<ApprovePlanResponse> =>
    ipcRenderer.invoke('ai:approve-plan', request),

  rejectPlan: (request: RejectPlanRequest): Promise<RejectPlanResponse> =>
    ipcRenderer.invoke('ai:reject-plan', request),

  // T037-T038: Load active plan on startup
  getActivePlan: (projectId: string): Promise<any | null> =>
    ipcRenderer.invoke('ai:get-active-plan', projectId),

  // History and tracking
  getGenerationHistory: (
    request: GetGenerationHistoryRequest
  ): Promise<GetGenerationHistoryResponse> =>
    ipcRenderer.invoke('ai:get-generation-history', request),

  getArchivedPlans: (request: GetArchivedPlansRequest): Promise<GetArchivedPlansResponse> =>
    ipcRenderer.invoke('ai:get-archived-plans', request),

  switchToArchivedPlan: (
    request: SwitchToArchivedPlanRequest
  ): Promise<SwitchToArchivedPlanResponse> =>
    ipcRenderer.invoke('ai:switch-to-archived-plan', request),

  getSessionCost: (request: GetSessionCostRequest): Promise<GetSessionCostResponse> =>
    ipcRenderer.invoke('ai:get-session-cost', request),

  // Settings
  getSettings: (request: GetAISettingsRequest): Promise<GetAISettingsResponse> =>
    ipcRenderer.invoke('ai:get-settings', request),

  updateSettings: (request: UpdateAISettingsRequest): Promise<UpdateAISettingsResponse> =>
    ipcRenderer.invoke('ai:update-settings', request),

  // API key management
  setAPIKey: (request: SetAPIKeyRequest): Promise<SetAPIKeyResponse> =>
    ipcRenderer.invoke('ai:set-api-key', request),

  testAPIKey: (request: TestAPIKeyRequest): Promise<TestAPIKeyResponse> =>
    ipcRenderer.invoke('ai:test-api-key', request),

  // Event listeners (for progress updates)
  onGenerationProgress: (callback: (event: AIGenerationProgressEvent) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: AIGenerationProgressEvent) => {
      callback(data);
    };
    ipcRenderer.on('ai:generation-progress', listener);

    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener('ai:generation-progress', listener);
    };
  },

  // Streaming progress listener (for real-time content streaming)
  onStreamingProgress: (callback: (event: AIStreamingProgressEvent) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: AIStreamingProgressEvent) => {
      callback(data);
    };
    ipcRenderer.on('ai:streaming-progress', listener);

    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener('ai:streaming-progress', listener);
    };
  },

  // Social club image generation
  generateSocialClubImage: (request: {
    projectId: string;
    scenarioId: string;
    prompt: string;
    amenities: any[];
    socialClubArea: number;
    storageType: string;
    maintenanceRoomSize: number;
  }): Promise<{ success: boolean; imagePath?: string; error?: string }> =>
    ipcRenderer.invoke('ai:generate-social-club-image', request),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('aiService', aiServiceAPI);

export type ElectronAPI = typeof electronAPI;
export type AIServiceAPI = typeof aiServiceAPI;
