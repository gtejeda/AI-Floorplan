/**
 * ProjectVisualization Model
 *
 * Represents an AI-generated image for a subdivision plan.
 * Supports multiple view types (site plan, aerial, context) with full metadata.
 */

export type ViewType = 'site-plan' | 'aerial' | 'context' | 'custom';
export type ImageFormat = 'jpeg' | 'png' | 'webp';

export interface ProjectVisualization {
  id: string;
  projectId: string;
  aiSubdivisionPlanId?: string;

  // Image metadata
  viewType: ViewType;
  filename: string;
  format: ImageFormat;
  sizeBytes: number;
  widthPixels: number;
  heightPixels: number;
  localPath: string;
  thumbnailPath?: string;

  // Generation metadata
  generatedAt: string; // ISO 8601
  aiModel: string;
  generationRequestId?: string;

  // Prompt details
  promptText: string;
  negativePromptText?: string;
  generationSeed?: number;

  // User annotations
  caption?: string;
  isApproved: boolean;
  isFinal: boolean;
}

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  model?: string;
  resolution?: '1024x1024' | '1792x1024' | '1024x1792';
  outputFormat?: 'png' | 'jpeg' | 'webp';
  seed?: number;
  guidanceScale?: number;
  steps?: number;
  metadata?: {
    projectId: string;
    viewType: ViewType;
    landDimensions: string;
  };
}

export interface ImageGenerationProgress {
  generationId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100
  imageUrl?: string;
  error?: {
    code: string;
    message: string;
  };
}
