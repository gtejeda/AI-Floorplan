/**
 * useAIImageGeneration Hook
 *
 * Manages state for AI image generation across multiple view types.
 * Handles async generation, progress tracking, and error handling.
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  ViewType,
  ProjectVisualization,
  ImageGenerationRequest,
} from '../models/ProjectVisualization';

interface ImageGenerationState {
  isGenerating: boolean;
  progress: number; // 0-100
  error: string | null;
  imageUrl: string | null;
}

interface MultiImageGenerationState {
  sitePlan: ImageGenerationState;
  aerial: ImageGenerationState;
  context: ImageGenerationState;
}

const initialImageState: ImageGenerationState = {
  isGenerating: false,
  progress: 0,
  error: null,
  imageUrl: null,
};

const initialState: MultiImageGenerationState = {
  sitePlan: { ...initialImageState },
  aerial: { ...initialImageState },
  context: { ...initialImageState },
};

export function useAIImageGeneration(projectId: string, planId?: string) {
  const [state, setState] = useState<MultiImageGenerationState>(initialState);
  const [visualizations, setVisualizations] = useState<ProjectVisualization[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Load existing visualizations for the plan
   */
  const loadVisualizations = useCallback(async () => {
    if (!planId) return;

    setIsLoading(true);
    try {
      const existing = await window.aiService.getProjectVisualizations(planId);
      setVisualizations(existing);

      // Update state with existing image URLs
      setState((prev) => ({
        sitePlan: {
          ...prev.sitePlan,
          imageUrl: existing.find((v) => v.viewType === 'site-plan')?.localPath || null,
        },
        aerial: {
          ...prev.aerial,
          imageUrl: existing.find((v) => v.viewType === 'aerial')?.localPath || null,
        },
        context: {
          ...prev.context,
          imageUrl: existing.find((v) => v.viewType === 'context')?.localPath || null,
        },
      }));
    } catch (error: any) {
      console.error('Failed to load visualizations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    loadVisualizations();
  }, [loadVisualizations]);

  /**
   * Generate a single image for a specific view type
   */
  const generateImage = useCallback(
    async (viewType: ViewType, request: ImageGenerationRequest): Promise<void> => {
      const stateKey =
        viewType === 'site-plan'
          ? 'sitePlan'
          : viewType === 'aerial'
            ? 'aerial'
            : viewType === 'context'
              ? 'context'
              : null;

      if (!stateKey) {
        throw new Error(`Unsupported view type: ${viewType}`);
      }

      setState((prev) => ({
        ...prev,
        [stateKey]: {
          isGenerating: true,
          progress: 0,
          error: null,
          imageUrl: null,
        },
      }));

      try {
        // Start generation (this now completes synchronously)
        const generationResult = await window.aiService.generateSitePlanImage(request);

        // Check if generation completed immediately (synchronous)
        const status = await window.aiService.getImageGenerationStatus(generationResult);

        if (status.status === 'completed' && status.localPath) {
          // Image is already generated and saved to database
          setState((prev) => ({
            ...prev,
            [stateKey]: {
              isGenerating: false,
              progress: 100,
              error: null,
              imageUrl: status.localPath,
            },
          }));

          // Reload visualizations to update the UI
          await loadVisualizations();
          return;
        }

        if (status.status === 'failed') {
          throw new Error(status.error?.message || 'Image generation failed');
        }

        // If for some reason it's not completed immediately, poll for completion
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
          await sleep(Math.min(2 ** attempts * 1000, 10000));

          const pollStatus = await window.aiService.getImageGenerationStatus(generationResult);

          // Update progress
          setState((prev) => ({
            ...prev,
            [stateKey]: {
              ...prev[stateKey],
              progress: pollStatus.progress || (attempts / maxAttempts) * 100,
            },
          }));

          if (pollStatus.status === 'completed' && pollStatus.localPath) {
            // Image generation complete
            setState((prev) => ({
              ...prev,
              [stateKey]: {
                isGenerating: false,
                progress: 100,
                error: null,
                imageUrl: pollStatus.localPath,
              },
            }));

            // Reload visualizations
            await loadVisualizations();
            return;
          }

          if (pollStatus.status === 'failed') {
            throw new Error(pollStatus.error?.message || 'Image generation failed');
          }

          attempts++;
        }

        throw new Error('Image generation timed out');
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          [stateKey]: {
            isGenerating: false,
            progress: 0,
            error: error.message || 'Unknown error occurred',
            imageUrl: null,
          },
        }));
        throw error;
      }
    },
    [projectId, planId, loadVisualizations]
  );

  /**
   * Regenerate an image with custom prompt refinements
   */
  const regenerateImage = useCallback(
    async (
      viewType: ViewType,
      baseRequest: ImageGenerationRequest,
      customRefinements?: string
    ): Promise<void> => {
      const refinedPrompt = customRefinements
        ? `${baseRequest.prompt}\n\nAdditional requirements: ${customRefinements}`
        : baseRequest.prompt;

      return generateImage(viewType, {
        ...baseRequest,
        prompt: refinedPrompt,
      });
    },
    [generateImage]
  );

  /**
   * Clear error for a specific view type
   */
  const clearError = useCallback((viewType: ViewType) => {
    const stateKey =
      viewType === 'site-plan' ? 'sitePlan' : viewType === 'aerial' ? 'aerial' : 'context';

    setState((prev) => ({
      ...prev,
      [stateKey]: {
        ...prev[stateKey],
        error: null,
      },
    }));
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setState(initialState);
    setVisualizations([]);
  }, []);

  return {
    // State
    state,
    visualizations,
    isLoading,

    // Actions
    generateImage,
    regenerateImage,
    clearError,
    reset,
    reload: loadVisualizations,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
