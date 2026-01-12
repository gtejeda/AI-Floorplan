/**
 * IPC Contracts: AI Subdivision Planning
 *
 * TypeScript type definitions and Zod schemas for IPC communication
 * between main process and renderer process.
 *
 * Channel naming convention: 'ai:<operation>'
 * All channels return Promises that resolve to typed responses.
 */

import { z } from 'zod';

// ============================================================================
// SUBDIVISION PLAN GENERATION
// ============================================================================

/**
 * Request to generate AI subdivision plan
 * Channel: 'ai:generate-subdivision-plan'
 */
export interface GenerateSubdivisionPlanRequest {
  projectId: string;
  landParcelId: string;
  landWidth: number; // meters
  landLength: number; // meters
  landArea: number; // sqm
  socialClubPercent: number; // 10-30
  targetLotCount?: number; // optional guidance
  province?: string; // for context in prompt
}

export const GenerateSubdivisionPlanRequestSchema = z.object({
  projectId: z.string().uuid(),
  landParcelId: z.string().uuid(),
  landWidth: z.number().positive(),
  landLength: z.number().positive(),
  landArea: z.number().positive(),
  socialClubPercent: z.number().int().min(10).max(30),
  targetLotCount: z.number().int().positive().optional(),
  province: z.string().optional()
});

/**
 * Response from subdivision plan generation
 */
export interface GenerateSubdivisionPlanResponse {
  planId: string; // UUID of created AISubdivisionPlan
  status: 'completed' | 'failed';
  plan?: SubdivisionPlan; // Full plan if successful
  validationStatus?: 'valid' | 'invalid' | 'warnings';
  validationErrors?: string[];
  validationWarnings?: string[];
  errorMessage?: string; // If generation failed
  tokensUsed?: number;
  generationTimeMs?: number;
}

export const GenerateSubdivisionPlanResponseSchema = z.object({
  planId: z.string().uuid(),
  status: z.enum(['completed', 'failed']),
  plan: z.object({
    lotLayout: z.array(z.object({
      lotNumber: z.number().int().positive(),
      dimensions: z.object({
        widthMeters: z.number().positive(),
        lengthMeters: z.number().positive(),
        areaSqm: z.number().positive()
      }),
      position: z.object({
        x: z.number(),
        y: z.number()
      })
    })),
    roadConfiguration: z.object({
      widthMeters: z.number().positive(),
      totalAreaSqm: z.number().positive(),
      layout: z.enum(['grid', 'perimeter', 'central-spine', 'loop'])
    }),
    amenityAreas: z.array(z.object({
      type: z.enum(['social-club', 'parking', 'green-space', 'maintenance']),
      areaSqm: z.number().positive(),
      position: z.object({
        x: z.number(),
        y: z.number()
      }),
      description: z.string().optional()
    })),
    metrics: z.object({
      totalLots: z.number().int().nonnegative(),
      viableLots: z.number().int().nonnegative(),
      invalidLots: z.array(z.number().int()),
      averageLotSizeSqm: z.number().positive(),
      landUtilizationPercent: z.number().min(0).max(100)
    })
  }).optional(),
  validationStatus: z.enum(['valid', 'invalid', 'warnings']).optional(),
  validationErrors: z.array(z.string()).optional(),
  validationWarnings: z.array(z.string()).optional(),
  errorMessage: z.string().optional(),
  tokensUsed: z.number().int().nonnegative().optional(),
  generationTimeMs: z.number().int().positive().optional()
});

// SubdivisionPlan structure (matches data-model.md)
export interface SubdivisionPlan {
  lotLayout: Lot[];
  roadConfiguration: RoadConfiguration;
  amenityAreas: AmenityArea[];
  metrics: SubdivisionMetrics;
}

export interface Lot {
  lotNumber: number;
  dimensions: {
    widthMeters: number;
    lengthMeters: number;
    areaSqm: number;
  };
  position: {
    x: number;
    y: number;
  };
}

export interface RoadConfiguration {
  widthMeters: number;
  totalAreaSqm: number;
  layout: 'grid' | 'perimeter' | 'central-spine' | 'loop';
}

export interface AmenityArea {
  type: 'social-club' | 'parking' | 'green-space' | 'maintenance';
  areaSqm: number;
  position: {
    x: number;
    y: number;
  };
  description?: string;
}

export interface SubdivisionMetrics {
  totalLots: number;
  viableLots: number;
  invalidLots: number[]; // Lot numbers below 90 sqm
  averageLotSizeSqm: number;
  landUtilizationPercent: number;
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================

/**
 * Request to generate site plan image
 * Channel: 'ai:generate-site-plan-image'
 */
export interface GenerateSitePlanImageRequest {
  projectId: string;
  subdivisionPlanId: string; // Must be approved plan
  viewType: 'site-plan' | 'aerial' | 'context';
  resolution?: '1024x1024' | '1792x1024' | '1024x1792';
  customPromptAdditions?: string; // User refinements
}

export const GenerateSitePlanImageRequestSchema = z.object({
  projectId: z.string().uuid(),
  subdivisionPlanId: z.string().uuid(),
  viewType: z.enum(['site-plan', 'aerial', 'context']),
  resolution: z.enum(['1024x1024', '1792x1024', '1024x1792']).optional(),
  customPromptAdditions: z.string().max(500).optional()
});

/**
 * Response from image generation
 */
export interface GenerateSitePlanImageResponse {
  visualizationId: string; // UUID of created ProjectVisualization
  status: 'completed' | 'failed';
  localPath?: string; // Absolute path to saved image
  filename?: string;
  format?: 'png' | 'jpeg' | 'webp';
  widthPixels?: number;
  heightPixels?: number;
  errorMessage?: string; // If generation failed
  generationTimeMs?: number;
}

export const GenerateSitePlanImageResponseSchema = z.object({
  visualizationId: z.string().uuid(),
  status: z.enum(['completed', 'failed']),
  localPath: z.string().optional(),
  filename: z.string().optional(),
  format: z.enum(['png', 'jpeg', 'webp']).optional(),
  widthPixels: z.number().int().positive().optional(),
  heightPixels: z.number().int().positive().optional(),
  errorMessage: z.string().optional(),
  generationTimeMs: z.number().int().positive().optional()
});

// ============================================================================
// PLAN APPROVAL
// ============================================================================

/**
 * Request to approve a subdivision plan
 * Channel: 'ai:approve-plan'
 */
export interface ApprovePlanRequest {
  planId: string; // UUID of AISubdivisionPlan
}

export const ApprovePlanRequestSchema = z.object({
  planId: z.string().uuid()
});

/**
 * Response from plan approval
 */
export interface ApprovePlanResponse {
  success: boolean;
  planId: string;
  approvedAt: string; // ISO 8601 timestamp
  errorMessage?: string;
}

export const ApprovePlanResponseSchema = z.object({
  success: z.boolean(),
  planId: z.string().uuid(),
  approvedAt: z.string().datetime(),
  errorMessage: z.string().optional()
});

// ============================================================================
// PLAN REJECTION
// ============================================================================

/**
 * Request to reject a subdivision plan
 * Channel: 'ai:reject-plan'
 */
export interface RejectPlanRequest {
  planId: string;
  reason?: string; // Optional feedback for refinement
}

export const RejectPlanRequestSchema = z.object({
  planId: z.string().uuid(),
  reason: z.string().max(500).optional()
});

/**
 * Response from plan rejection
 */
export interface RejectPlanResponse {
  success: boolean;
  planId: string;
  errorMessage?: string;
}

export const RejectPlanResponseSchema = z.object({
  success: z.boolean(),
  planId: z.string().uuid(),
  errorMessage: z.string().optional()
});

// ============================================================================
// GENERATION HISTORY
// ============================================================================

/**
 * Request to get generation history for a project
 * Channel: 'ai:get-generation-history'
 */
export interface GetGenerationHistoryRequest {
  projectId: string;
  limit?: number; // Max results (default 20)
  offset?: number; // Pagination offset
  includeRejected?: boolean; // Include rejected plans
}

export const GetGenerationHistoryRequestSchema = z.object({
  projectId: z.string().uuid(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
  includeRejected: z.boolean().optional()
});

/**
 * Response with generation history
 */
export interface GetGenerationHistoryResponse {
  plans: AISubdivisionPlanSummary[];
  total: number; // Total count (for pagination)
}

export const GetGenerationHistoryResponseSchema = z.object({
  plans: z.array(z.object({
    id: z.string().uuid(),
    generatedAt: z.string().datetime(),
    generationStatus: z.enum(['pending', 'completed', 'failed', 'rejected']),
    validationStatus: z.enum(['valid', 'invalid', 'warnings']),
    approvedByUser: z.boolean(),
    viableLots: z.number().int().nonnegative(),
    totalLots: z.number().int().nonnegative(),
    landUtilizationPercent: z.number().min(0).max(100)
  })),
  total: z.number().int().nonnegative()
});

export interface AISubdivisionPlanSummary {
  id: string;
  generatedAt: string; // ISO 8601
  generationStatus: 'pending' | 'completed' | 'failed' | 'rejected';
  validationStatus: 'valid' | 'invalid' | 'warnings';
  approvedByUser: boolean;
  viableLots: number;
  totalLots: number;
  landUtilizationPercent: number;
}

// ============================================================================
// PROGRESS EVENTS (Renderer → Main communication)
// ============================================================================

/**
 * Progress event emitted during AI operations
 * Sent via event.sender.send('ai:generation-progress', data)
 */
export interface AIGenerationProgressEvent {
  operationType: 'subdivision-plan' | 'image-generation';
  status: 'started' | 'retrying' | 'processing' | 'validating' | 'completed' | 'failed';
  attempt?: number; // Retry attempt number
  message: string; // User-friendly status message
  progress?: number; // 0-100 percentage (if available)
}

export const AIGenerationProgressEventSchema = z.object({
  operationType: z.enum(['subdivision-plan', 'image-generation']),
  status: z.enum(['started', 'retrying', 'processing', 'validating', 'completed', 'failed']),
  attempt: z.number().int().positive().optional(),
  message: z.string(),
  progress: z.number().min(0).max(100).optional()
});

// ============================================================================
// COST TRACKING
// ============================================================================

/**
 * Request to get session cost statistics
 * Channel: 'ai:get-session-cost'
 */
export interface GetSessionCostRequest {
  projectId: string;
}

export const GetSessionCostRequestSchema = z.object({
  projectId: z.string().uuid()
});

/**
 * Response with cost statistics
 */
export interface GetSessionCostResponse {
  sessionStartDate: string; // ISO 8601 (start of day)
  geminiCalls: number;
  imageCalls: number;
  totalTokensUsed: number;
  estimatedCostUsd: number;
  remainingBudget?: number; // If maxCostPerSessionUsd is set
}

export const GetSessionCostResponseSchema = z.object({
  sessionStartDate: z.string().datetime(),
  geminiCalls: z.number().int().nonnegative(),
  imageCalls: z.number().int().nonnegative(),
  totalTokensUsed: z.number().int().nonnegative(),
  estimatedCostUsd: z.number().nonnegative(),
  remainingBudget: z.number().nonnegative().optional()
});

// ============================================================================
// AI SETTINGS
// ============================================================================

/**
 * Request to get AI settings
 * Channel: 'ai:get-settings'
 */
export interface GetAISettingsRequest {
  projectId?: string; // null = global settings
}

export const GetAISettingsRequestSchema = z.object({
  projectId: z.string().uuid().optional()
});

/**
 * Response with AI settings
 */
export interface GetAISettingsResponse {
  settings: AISettings;
}

export interface AISettings {
  id: string;
  projectId?: string;
  subdivisionModel: string;
  imageModel: string;
  autoApproveValidPlans: boolean;
  maxAutoRetries: number;
  preferredLotAspectRatio?: number;
  preferredRoadLayout?: 'grid' | 'perimeter' | 'central-spine' | 'loop' | 'auto';
  imageStyle?: string;
  includeContextLandmarks: boolean;
  enableCostWarnings: boolean;
  maxCostPerSessionUsd?: number;
}

export const GetAISettingsResponseSchema = z.object({
  settings: z.object({
    id: z.string().uuid(),
    projectId: z.string().uuid().optional(),
    subdivisionModel: z.string(),
    imageModel: z.string(),
    autoApproveValidPlans: z.boolean(),
    maxAutoRetries: z.number().int().min(0).max(5),
    preferredLotAspectRatio: z.number().positive().optional(),
    preferredRoadLayout: z.enum(['grid', 'perimeter', 'central-spine', 'loop', 'auto']).optional(),
    imageStyle: z.string().optional(),
    includeContextLandmarks: z.boolean(),
    enableCostWarnings: z.boolean(),
    maxCostPerSessionUsd: z.number().positive().optional()
  })
});

/**
 * Request to update AI settings
 * Channel: 'ai:update-settings'
 */
export interface UpdateAISettingsRequest {
  projectId?: string; // null = update global settings
  settings: Partial<Omit<AISettings, 'id' | 'projectId'>>;
}

export const UpdateAISettingsRequestSchema = z.object({
  projectId: z.string().uuid().optional(),
  settings: z.object({
    subdivisionModel: z.string().optional(),
    imageModel: z.string().optional(),
    autoApproveValidPlans: z.boolean().optional(),
    maxAutoRetries: z.number().int().min(0).max(5).optional(),
    preferredLotAspectRatio: z.number().positive().optional(),
    preferredRoadLayout: z.enum(['grid', 'perimeter', 'central-spine', 'loop', 'auto']).optional(),
    imageStyle: z.string().optional(),
    includeContextLandmarks: z.boolean().optional(),
    enableCostWarnings: z.boolean().optional(),
    maxCostPerSessionUsd: z.number().positive().optional()
  })
});

/**
 * Response from settings update
 */
export interface UpdateAISettingsResponse {
  success: boolean;
  settings?: AISettings;
  errorMessage?: string;
}

export const UpdateAISettingsResponseSchema = z.object({
  success: z.boolean(),
  settings: GetAISettingsResponseSchema.shape.settings.optional(),
  errorMessage: z.string().optional()
});

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

/**
 * Request to set API key (encrypted storage)
 * Channel: 'ai:set-api-key'
 */
export interface SetAPIKeyRequest {
  service: 'gemini' | 'image';
  apiKey: string; // Plain text (will be encrypted in main process)
}

export const SetAPIKeyRequestSchema = z.object({
  service: z.enum(['gemini', 'image']),
  apiKey: z.string().min(1)
});

/**
 * Response from API key update
 */
export interface SetAPIKeyResponse {
  success: boolean;
  errorMessage?: string;
}

export const SetAPIKeyResponseSchema = z.object({
  success: z.boolean(),
  errorMessage: z.string().optional()
});

/**
 * Request to test API key validity
 * Channel: 'ai:test-api-key'
 */
export interface TestAPIKeyRequest {
  service: 'gemini' | 'image';
}

export const TestAPIKeyRequestSchema = z.object({
  service: z.enum(['gemini', 'image'])
});

/**
 * Response from API key test
 */
export interface TestAPIKeyResponse {
  valid: boolean;
  errorMessage?: string;
}

export const TestAPIKeyResponseSchema = z.object({
  valid: z.boolean(),
  errorMessage: z.string().optional()
});

// ============================================================================
// TYPE EXPORTS FOR RENDERER
// ============================================================================

/**
 * Type definition for window.aiService exposed via contextBridge
 * Use this in renderer process to get full type safety
 */
export interface AIServiceAPI {
  // Subdivision plan generation
  generateSubdivisionPlan(
    request: GenerateSubdivisionPlanRequest
  ): Promise<GenerateSubdivisionPlanResponse>;

  // Image generation
  generateSitePlanImage(
    request: GenerateSitePlanImageRequest
  ): Promise<GenerateSitePlanImageResponse>;

  // Plan management
  approvePlan(request: ApprovePlanRequest): Promise<ApprovePlanResponse>;
  rejectPlan(request: RejectPlanRequest): Promise<RejectPlanResponse>;

  // History and tracking
  getGenerationHistory(
    request: GetGenerationHistoryRequest
  ): Promise<GetGenerationHistoryResponse>;

  getSessionCost(request: GetSessionCostRequest): Promise<GetSessionCostResponse>;

  // Settings
  getSettings(request: GetAISettingsRequest): Promise<GetAISettingsResponse>;
  updateSettings(request: UpdateAISettingsRequest): Promise<UpdateAISettingsResponse>;

  // API key management
  setAPIKey(request: SetAPIKeyRequest): Promise<SetAPIKeyResponse>;
  testAPIKey(request: TestAPIKeyRequest): Promise<TestAPIKeyResponse>;

  // Event listeners (for progress updates)
  onGenerationProgress(
    callback: (event: AIGenerationProgressEvent) => void
  ): () => void; // Returns unsubscribe function
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates IPC request against schema
 * Throws ZodError if validation fails
 */
export function validateIPCRequest<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): T {
  return schema.parse(data);
}

/**
 * Validates IPC response against schema
 * Returns validation result without throwing
 */
export function safeValidateIPCResponse<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ============================================================================
// EXAMPLE USAGE IN MAIN PROCESS
// ============================================================================

/**
 * Example IPC handler registration in main process
 *
 * ```typescript
 * import { ipcMain } from 'electron';
 * import {
 *   GenerateSubdivisionPlanRequest,
 *   GenerateSubdivisionPlanRequestSchema,
 *   GenerateSubdivisionPlanResponse,
 *   validateIPCRequest
 * } from './contracts/ipc-subdivision-ai';
 *
 * ipcMain.handle('ai:generate-subdivision-plan', async (event, rawRequest) => {
 *   // Validate request
 *   const request = validateIPCRequest(rawRequest, GenerateSubdivisionPlanRequestSchema);
 *
 *   // Execute AI generation
 *   const response: GenerateSubdivisionPlanResponse = await generatePlan(request);
 *
 *   return response;
 * });
 * ```
 */

// ============================================================================
// EXAMPLE USAGE IN PRELOAD SCRIPT
// ============================================================================

/**
 * Example contextBridge exposure in preload script
 *
 * ```typescript
 * import { contextBridge, ipcRenderer } from 'electron';
 * import { AIServiceAPI } from './contracts/ipc-subdivision-ai';
 *
 * contextBridge.exposeInMainWorld('aiService', {
 *   generateSubdivisionPlan: (request) =>
 *     ipcRenderer.invoke('ai:generate-subdivision-plan', request),
 *
 *   generateSitePlanImage: (request) =>
 *     ipcRenderer.invoke('ai:generate-site-plan-image', request),
 *
 *   approvePlan: (request) =>
 *     ipcRenderer.invoke('ai:approve-plan', request),
 *
 *   rejectPlan: (request) =>
 *     ipcRenderer.invoke('ai:reject-plan', request),
 *
 *   getGenerationHistory: (request) =>
 *     ipcRenderer.invoke('ai:get-generation-history', request),
 *
 *   getSessionCost: (request) =>
 *     ipcRenderer.invoke('ai:get-session-cost', request),
 *
 *   getSettings: (request) =>
 *     ipcRenderer.invoke('ai:get-settings', request),
 *
 *   updateSettings: (request) =>
 *     ipcRenderer.invoke('ai:update-settings', request),
 *
 *   setAPIKey: (request) =>
 *     ipcRenderer.invoke('ai:set-api-key', request),
 *
 *   testAPIKey: (request) =>
 *     ipcRenderer.invoke('ai:test-api-key', request),
 *
 *   onGenerationProgress: (callback) => {
 *     const subscription = (_event, data) => callback(data);
 *     ipcRenderer.on('ai:generation-progress', subscription);
 *     return () => ipcRenderer.removeListener('ai:generation-progress', subscription);
 *   }
 * } as AIServiceAPI);
 * ```
 */
