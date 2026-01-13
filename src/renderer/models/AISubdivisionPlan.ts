/**
 * AISubdivisionPlan - Complete AI-generated subdivision plan with metadata
 * Stores the full plan structure along with validation and approval status
 */

import type { SubdivisionPlan } from './SubdivisionPlan';

export type GenerationStatus = 'pending' | 'completed' | 'failed' | 'rejected';
export type ValidationStatus = 'valid' | 'invalid' | 'warnings';

export interface AISubdivisionPlan {
  id: string; // UUID
  projectId: string;
  landParcelId: string;

  // Generation metadata
  generatedAt: string; // ISO 8601
  generationStatus: GenerationStatus;
  generationTimeMs?: number;
  retryCount: number;

  // Input parameters (for regeneration)
  inputLandWidth: number;
  inputLandLength: number;
  inputLandArea: number;
  inputSocialClubPercent: number;
  inputTargetLotCount?: number;

  // AI model metadata
  aiModel: string; // e.g., 'gemini-2.5-flash'
  aiModelVersion?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;

  // Generated plan
  plan: SubdivisionPlan;

  // Validation
  validationStatus: ValidationStatus;
  validationErrors?: string[];
  validationWarnings?: string[];

  // User actions
  approvedByUser: boolean;
  approvedAt?: string; // ISO 8601
  rejectionReason?: string;
}

/**
 * Summary view for history/listing
 */
export interface AISubdivisionPlanSummary {
  id: string;
  generatedAt: string;
  generationStatus: GenerationStatus;
  validationStatus: ValidationStatus;
  approvedByUser: boolean;
  viableLots: number;
  totalLots: number;
  landUtilizationPercent: number;
}
