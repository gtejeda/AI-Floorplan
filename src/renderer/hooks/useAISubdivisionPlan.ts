/**
 * useAISubdivisionPlan Hook
 * React hook for managing AI-powered subdivision plan generation
 * Handles generation, validation, approval/rejection, and history
 */

import { useState, useCallback, useEffect } from 'react';
import type { AISubdivisionPlan, AISubdivisionPlanSummary } from '../models/AISubdivisionPlan';
import type { SubdivisionPlan } from '../models/SubdivisionPlan';
import type {
  GenerateSubdivisionPlanRequest,
  GenerateSubdivisionPlanResponse,
  AIGenerationProgressEvent,
} from '../../shared/ai-contracts';
import {
  validateSubdivisionPlan,
  generateMultiplePlans,
  type MultiplePlansRequest,
  activatePlan,
  type ActivatePlanRequest,
} from '../services/ai-subdivision-service';

export interface GenerationState {
  isGenerating: boolean;
  progress?: AIGenerationProgressEvent;
  error?: string;
}

export interface UseAISubdivisionPlanReturn {
  // State
  currentPlan: AISubdivisionPlan | null;
  generationState: GenerationState;
  planHistory: AISubdivisionPlanSummary[];

  // Phase 5: Multi-plan state
  multiplePlans: AISubdivisionPlan[];
  selectedPlanId: string | null;
  isGeneratingMultiple: boolean;

  // Actions
  generatePlan: (request: GenerateSubdivisionPlanRequest) => Promise<void>;
  approvePlan: (planId: string) => Promise<void>;
  rejectPlan: (planId: string, reason?: string) => Promise<void>;
  loadPlanHistory: (projectId: string) => Promise<void>;
  selectPlanFromHistory: (planId: string) => Promise<void>;
  clearCurrentPlan: () => void;
  loadActivePlan: (projectId: string) => Promise<void>;

  // Phase 5: Multi-plan actions
  generateMultiplePlansAction: (request: MultiplePlansRequest) => Promise<void>;
  selectPlan: (planId: string) => void;
  activateSelectedPlan: (projectId: string) => Promise<void>;
  clearMultiplePlans: () => void;
}

/**
 * Hook for AI subdivision plan generation and management
 */
export function useAISubdivisionPlan(): UseAISubdivisionPlanReturn {
  const [currentPlan, setCurrentPlan] = useState<AISubdivisionPlan | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
  });
  const [planHistory, setPlanHistory] = useState<AISubdivisionPlanSummary[]>([]);

  // Phase 5: Multi-plan state (T119)
  const [multiplePlans, setMultiplePlans] = useState<AISubdivisionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isGeneratingMultiple, setIsGeneratingMultiple] = useState(false);

  /**
   * Listen for generation progress events
   */
  useEffect(() => {
    const unsubscribe = window.aiService.onGenerationProgress((event) => {
      setGenerationState((prev) => ({
        ...prev,
        progress: event,
      }));

      // Clear progress on completion or failure
      if (event.status === 'completed' || event.status === 'failed') {
        setTimeout(() => {
          setGenerationState((prev) => ({
            ...prev,
            progress: undefined,
          }));
        }, 2000);
      }
    });

    return unsubscribe;
  }, []);

  /**
   * Generate a new subdivision plan
   */
  const generatePlan = useCallback(async (request: GenerateSubdivisionPlanRequest) => {
    setGenerationState({ isGenerating: true, error: undefined });

    try {
      const response: GenerateSubdivisionPlanResponse =
        await window.aiService.generateSubdivisionPlan(request);

      if (response.status === 'failed') {
        throw new Error(response.errorMessage || 'Plan generation failed');
      }

      // Convert response to AISubdivisionPlan
      const plan: AISubdivisionPlan = {
        id: response.planId,
        projectId: request.projectId,
        landParcelId: request.landParcelId,
        generatedAt: new Date().toISOString(),
        generationStatus: 'completed',
        generationTimeMs: response.generationTimeMs,
        retryCount: 0,
        inputLandWidth: request.landWidth,
        inputLandLength: request.landLength,
        inputLandArea: request.landArea,
        inputSocialClubPercent: request.socialClubPercent,
        inputTargetLotCount: request.targetLotCount,
        aiModel: 'gemini-2.5-flash',
        promptTokens: response.tokensUsed,
        totalTokens: response.tokensUsed,
        plan: response.plan!,
        validationStatus: response.validationStatus || 'valid',
        validationErrors: response.validationErrors,
        validationWarnings: response.validationWarnings,
        approvedByUser: false,
      };

      setCurrentPlan(plan);
      setGenerationState({ isGenerating: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setGenerationState({
        isGenerating: false,
        error: errorMessage,
      });
      console.error('[useAISubdivisionPlan] Generation failed:', error);
    }
  }, []);

  /**
   * Approve the current plan
   */
  const approvePlan = useCallback(async (planId: string) => {
    try {
      const response = await window.aiService.approvePlan({ planId });

      if (!response.success) {
        throw new Error(response.errorMessage || 'Failed to approve plan');
      }

      // Update current plan if it matches
      setCurrentPlan((prev) => {
        if (prev && prev.id === planId) {
          return {
            ...prev,
            approvedByUser: true,
            approvedAt: response.approvedAt,
          };
        }
        return prev;
      });
    } catch (error) {
      console.error('[useAISubdivisionPlan] Approval failed:', error);
      throw error;
    }
  }, []);

  /**
   * Reject the current plan
   */
  const rejectPlan = useCallback(async (planId: string, reason?: string) => {
    try {
      const response = await window.aiService.rejectPlan({ planId, reason });

      if (!response.success) {
        throw new Error(response.errorMessage || 'Failed to reject plan');
      }

      // Clear current plan if it matches
      setCurrentPlan((prev) => {
        if (prev && prev.id === planId) {
          return null;
        }
        return prev;
      });
    } catch (error) {
      console.error('[useAISubdivisionPlan] Rejection failed:', error);
      throw error;
    }
  }, []);

  /**
   * Load plan generation history for a project
   */
  const loadPlanHistory = useCallback(async (projectId: string) => {
    try {
      const response = await window.aiService.getGenerationHistory({
        projectId,
        limit: 20,
        includeRejected: false,
      });

      setPlanHistory(response.plans);
    } catch (error) {
      console.error('[useAISubdivisionPlan] Failed to load history:', error);
    }
  }, []);

  /**
   * Select a plan from history to view
   */
  const selectPlanFromHistory = useCallback(async (planId: string) => {
    // This would require an additional IPC channel to fetch full plan details
    // For now, we'll just log it
    console.log('[useAISubdivisionPlan] Select plan from history:', planId);
    // TODO: Implement when backend supports fetching plan by ID
  }, []);

  /**
   * Clear the current plan
   */
  const clearCurrentPlan = useCallback(() => {
    setCurrentPlan(null);
    setGenerationState({ isGenerating: false, error: undefined });
  }, []);

  // ============================================================================
  // Phase 5: Multi-plan generation and comparison
  // ============================================================================

  /**
   * T120: Generate multiple plan variations for comparison
   */
  const generateMultiplePlansAction = useCallback(async (request: MultiplePlansRequest) => {
    setIsGeneratingMultiple(true);
    setGenerationState({ isGenerating: true, error: undefined });

    try {
      const plans = await generateMultiplePlans(request);
      setMultiplePlans(plans);

      // Automatically select first plan as default
      if (plans.length > 0) {
        setSelectedPlanId(plans[0].id);
        setCurrentPlan(plans[0]);
      }

      setIsGeneratingMultiple(false);
      setGenerationState({ isGenerating: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to generate multiple plans';
      setGenerationState({
        isGenerating: false,
        error: errorMessage,
      });
      setIsGeneratingMultiple(false);
      console.error('[useAISubdivisionPlan] Multi-plan generation failed:', error);
    }
  }, []);

  /**
   * T121: Select a plan from the comparison set
   */
  const selectPlan = useCallback(
    (planId: string) => {
      const plan = multiplePlans.find((p) => p.id === planId);
      if (plan) {
        setSelectedPlanId(planId);
        setCurrentPlan(plan);
      }
    },
    [multiplePlans]
  );

  /**
   * T121: Activate the selected plan (mark as active in database)
   */
  const activateSelectedPlan = useCallback(
    async (projectId: string) => {
      if (!selectedPlanId) {
        throw new Error('No plan selected');
      }

      try {
        await activatePlan({
          planId: selectedPlanId,
          projectId,
        });

        // Update the selected plan's status
        setMultiplePlans((prev) =>
          prev.map((plan) =>
            plan.id === selectedPlanId
              ? { ...plan, approvedByUser: true, approvedAt: new Date().toISOString() }
              : plan
          )
        );

        // Also update current plan
        setCurrentPlan((prev) =>
          prev && prev.id === selectedPlanId
            ? { ...prev, approvedByUser: true, approvedAt: new Date().toISOString() }
            : prev
        );
      } catch (error) {
        console.error('[useAISubdivisionPlan] Plan activation failed:', error);
        throw error;
      }
    },
    [selectedPlanId]
  );

  /**
   * Clear multi-plan comparison state
   */
  const clearMultiplePlans = useCallback(() => {
    setMultiplePlans([]);
    setSelectedPlanId(null);
    setIsGeneratingMultiple(false);
  }, []);

  /**
   * T037-T038: Load active plan from database on startup
   */
  const loadActivePlan = useCallback(async (projectId: string) => {
    try {
      console.log('[useAISubdivisionPlan] Loading active plan for project:', projectId);
      const response = await window.aiService.getActivePlan(projectId);

      console.log('[useAISubdivisionPlan] getActivePlan response:', response);

      // IPC handler returns { plan }, so we need to access response.plan
      if (response && response.plan) {
        const activePlan = response.plan;

        // Parse the plan data from JSON (use plan_json, not planJson)
        const planData = JSON.parse(activePlan.plan_json);
        const loadedPlan: AISubdivisionPlan = {
          id: activePlan.id,
          projectId: activePlan.project_id,
          generatedAt: activePlan.generated_at,
          approvedByUser: activePlan.approvedByUser || activePlan.approved_by_user === 1, // Try converted boolean first
          approvedAt: activePlan.approved_at,
          validationStatus: activePlan.validation_status,
          validationErrors: activePlan.validation_errors
            ? JSON.parse(activePlan.validation_errors)
            : null,
          validationWarnings: activePlan.validation_warnings
            ? JSON.parse(activePlan.validation_warnings)
            : null,
          generationTimeMs: activePlan.generation_time_ms,
          plan: planData,
        };

        setCurrentPlan(loadedPlan);
        console.log('[useAISubdivisionPlan] Active plan loaded on startup:', loadedPlan);
      } else {
        console.log('[useAISubdivisionPlan] No active plan found for project');
      }
    } catch (error) {
      console.error('[useAISubdivisionPlan] Failed to load active plan:', error);
    }
  }, []);

  return {
    currentPlan,
    generationState,
    planHistory,
    multiplePlans,
    selectedPlanId,
    isGeneratingMultiple,
    generatePlan,
    approvePlan,
    rejectPlan,
    loadPlanHistory,
    selectPlanFromHistory,
    clearCurrentPlan,
    loadActivePlan,
    generateMultiplePlansAction,
    selectPlan,
    activateSelectedPlan,
    clearMultiplePlans,
  };
}
