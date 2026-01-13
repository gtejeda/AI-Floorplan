/**
 * AISettings - User preferences for AI generation
 * Supports both global and per-project settings
 */

export type RoadLayout = 'grid' | 'perimeter' | 'central-spine' | 'loop' | 'auto';

export interface AISettings {
  id: string;
  projectId?: string; // null = global settings

  // Model preferences
  subdivisionModel: string; // e.g., 'gemini-2.5-flash'
  imageModel: string; // e.g., 'dall-e-3'

  // Generation preferences
  autoApproveValidPlans: boolean;
  maxAutoRetries: number; // 0-5
  preferredLotAspectRatio?: number; // e.g., 0.9 for nearly square
  preferredRoadLayout?: RoadLayout;

  // Image preferences
  imageStyle?: string; // e.g., 'photorealistic', 'architectural-drawing'
  includeContextLandmarks: boolean;

  // Cost controls
  enableCostWarnings: boolean;
  maxCostPerSessionUsd?: number; // null = no limit

  // Timestamps
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Default settings for new projects
 */
export const DEFAULT_AI_SETTINGS: Omit<AISettings, 'id' | 'projectId' | 'createdAt' | 'updatedAt'> =
  {
    subdivisionModel: 'gemini-2.5-flash',
    imageModel: 'dall-e-3',
    autoApproveValidPlans: false,
    maxAutoRetries: 3,
    preferredLotAspectRatio: 1.0, // Square lots
    preferredRoadLayout: 'auto',
    imageStyle: 'photorealistic',
    includeContextLandmarks: true,
    enableCostWarnings: true,
    maxCostPerSessionUsd: 5.0, // $5 daily limit
  };
