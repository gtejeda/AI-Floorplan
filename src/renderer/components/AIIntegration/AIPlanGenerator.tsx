/**
 * AIPlanGenerator Component
 * User interface for generating AI-powered subdivision plans in real-time
 * Provides input controls and triggers plan generation via Gemini API
 */

import React, { useState } from 'react';
import type { GenerateSubdivisionPlanRequest } from '../../../shared/ai-contracts';
import type { GenerationState } from '../../hooks/useAISubdivisionPlan';
import { PromptEditorModal } from './PromptEditorModal';
import './AIPlanGenerator.css';

export interface AIPlanGeneratorProps {
  projectId: string;
  landParcelId: string;
  landWidth: number;
  landLength: number;
  landArea: number;
  province?: string;
  generationState: GenerationState;
  onGenerate: (request: GenerateSubdivisionPlanRequest) => void;
  disabled?: boolean;
}

export const AIPlanGenerator: React.FC<AIPlanGeneratorProps> = ({
  projectId,
  landParcelId,
  landWidth,
  landLength,
  landArea,
  province,
  generationState,
  onGenerate,
  disabled = false,
}) => {
  const [socialClubPercent, setSocialClubPercent] = useState<number>(20);
  const [targetLotCount, setTargetLotCount] = useState<number | undefined>(undefined);
  const [planCount, setPlanCount] = useState<number>(1);

  // Prompt editor state
  const [promptEditorState, setPromptEditorState] = useState<{
    isOpen: boolean;
    prompt: string;
    count: number;
  }>({
    isOpen: false,
    prompt: '',
    count: 1,
  });
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);

  // Handle generate button click - fetch prompt and open editor
  const handleGenerateClick = async (count?: number) => {
    setIsLoadingPrompt(true);
    try {
      const promptPreview = await window.aiService.previewSubdivisionPrompt({
        landWidth,
        landLength,
        landArea,
        socialClubPercent,
        targetLotCount,
        province,
        strategy: 'balanced', // Default strategy
      });

      setPromptEditorState({
        isOpen: true,
        prompt: promptPreview.prompt,
        count: count || 1,
      });
    } catch (error) {
      console.error('Failed to fetch subdivision prompt:', error);
      alert('Failed to load prompt. Please try again.');
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  // Handle prompt confirm - trigger generation with custom prompt
  const handlePromptConfirm = (editedPrompt: string) => {
    const request: GenerateSubdivisionPlanRequest = {
      projectId,
      landParcelId,
      landWidth,
      landLength,
      landArea,
      socialClubPercent,
      targetLotCount,
      province,
      count: promptEditorState.count,
      customPrompt: editedPrompt !== promptEditorState.prompt ? editedPrompt : undefined,
    };

    onGenerate(request);

    // Close modal
    setPromptEditorState({
      isOpen: false,
      prompt: '',
      count: 1,
    });
  };

  // Handle prompt cancel
  const handlePromptCancel = () => {
    setPromptEditorState({
      isOpen: false,
      prompt: '',
      count: 1,
    });
  };

  const estimatedLots = Math.floor((landArea * (1 - socialClubPercent / 100) * 0.85) / 90);

  return (
    <div className="ai-plan-generator">
      <div className="generator-header">
        <h3>🤖 AI Subdivision Planning</h3>
        <p className="generator-description">
          Generate optimized subdivision layouts using AI. All lots will meet the 90 sqm minimum
          requirement.
        </p>
      </div>

      <div className="generator-form">
        {/* Land Info Display */}
        <div className="land-info-summary">
          <div className="info-item">
            <span className="label">Land Area:</span>
            <span className="value">{landArea.toFixed(0)} sqm</span>
          </div>
          <div className="info-item">
            <span className="label">Dimensions:</span>
            <span className="value">
              {landWidth}m × {landLength}m
            </span>
          </div>
          {province && (
            <div className="info-item">
              <span className="label">Location:</span>
              <span className="value">{province}</span>
            </div>
          )}
        </div>

        {/* Social Club Percentage */}
        <div className="form-group">
          <label htmlFor="socialClubPercent">
            Social Club Area
            <span className="field-hint">Required community space</span>
          </label>
          <div className="slider-container">
            <input
              type="range"
              id="socialClubPercent"
              min="10"
              max="30"
              step="1"
              value={socialClubPercent}
              onChange={(e) => setSocialClubPercent(Number(e.target.value))}
              disabled={disabled || generationState.isGenerating}
            />
            <div className="slider-value">
              <span className="percentage">{socialClubPercent}%</span>
              <span className="area">
                ({(landArea * (socialClubPercent / 100)).toFixed(0)} sqm)
              </span>
            </div>
          </div>
        </div>

        {/* Target Lot Count (Optional) */}
        <div className="form-group">
          <label htmlFor="targetLotCount">
            Target Lot Count <span className="optional">(Optional)</span>
            <span className="field-hint">AI will optimize around this target</span>
          </label>
          <input
            type="number"
            id="targetLotCount"
            min="1"
            max={Math.floor(landArea / 90)}
            value={targetLotCount || ''}
            onChange={(e) => setTargetLotCount(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={`Leave empty for auto (est. ~${estimatedLots} lots)`}
            disabled={disabled || generationState.isGenerating}
          />
        </div>

        {/* Estimated Output */}
        <div className="estimation-box">
          <div className="estimation-icon">💡</div>
          <div className="estimation-text">
            <strong>Estimated Output:</strong> ~{estimatedLots} viable lots
            <br />
            <small>Actual result may vary based on optimal layout configuration</small>
          </div>
        </div>

        {/* Generation Progress */}
        {generationState.progress && (
          <div className={`progress-indicator ${generationState.progress.status}`}>
            <div className="progress-icon">
              {generationState.progress.status === 'started' && '🚀'}
              {generationState.progress.status === 'processing' && '⚙️'}
              {generationState.progress.status === 'validating' && '✓'}
              {generationState.progress.status === 'completed' && '✅'}
              {generationState.progress.status === 'failed' && '❌'}
            </div>
            <div className="progress-message">{generationState.progress.message}</div>
            {generationState.progress.attempt && generationState.progress.attempt > 1 && (
              <div className="retry-badge">Retry {generationState.progress.attempt}</div>
            )}
          </div>
        )}

        {/* Error Display */}
        {generationState.error && (
          <div className="error-message">
            <div className="error-icon">⚠️</div>
            <div className="error-text">{generationState.error}</div>
          </div>
        )}

        {/* Plan Count Selector (Phase 5) */}
        <div className="form-group multiple-options">
          <label htmlFor="planCount">
            Number of Plan Options
            <span className="field-hint">Compare multiple AI-generated layouts</span>
          </label>
          <div className="plan-count-selector">
            {[1, 3, 4, 5].map((count) => (
              <button
                key={count}
                type="button"
                className={`count-option ${planCount === count ? 'active' : ''}`}
                onClick={() => setPlanCount(count)}
                disabled={disabled || generationState.isGenerating}
              >
                {count === 1 ? 'Single' : `${count} Options`}
              </button>
            ))}
          </div>
          {planCount > 1 && (
            <div className="multiple-options-note">
              <span className="info-icon">ℹ️</span>
              <small>
                AI will generate {planCount} different layouts with varied configurations (lot
                sizes, road layouts, amenity placements). You'll be able to compare them
                side-by-side.
              </small>
            </div>
          )}
        </div>

        {/* Generate Buttons */}
        <div className="button-group">
          <button
            type="button"
            className="btn-generate primary"
            onClick={() => handleGenerateClick(planCount)}
            disabled={disabled || generationState.isGenerating || isLoadingPrompt}
          >
            {isLoadingPrompt ? (
              <>
                <span className="spinner"></span>
                Loading Prompt...
              </>
            ) : generationState.isGenerating ? (
              <>
                <span className="spinner"></span>
                Generating {planCount > 1 ? `${planCount} Plans` : 'Plan'}...
              </>
            ) : (
              <>
                <span className="icon">🤖</span>
                {planCount > 1 ? `Generate ${planCount} Options` : 'Generate Subdivision Plan'}
              </>
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="help-text">
          <p>
            <strong>How it works:</strong> AI analyzes your land dimensions and generates an
            optimized subdivision layout with lots, roads, and social club area. Generation
            typically takes 5-10 seconds.
          </p>
          <p className="cost-note">
            <span className="cost-icon">💰</span>
            <small>Cost: ~$0.0007 USD per plan (Gemini 2.5 Flash)</small>
          </p>
        </div>
      </div>

      {/* Prompt Editor Modal */}
      {promptEditorState.isOpen && (
        <PromptEditorModal
          isOpen={promptEditorState.isOpen}
          prompt={promptEditorState.prompt}
          title="Edit Subdivision Plan Prompt"
          isGenerating={generationState.isGenerating}
          confirmButtonText={
            promptEditorState.count > 1
              ? `Generate ${promptEditorState.count} Plans`
              : 'Generate Plan'
          }
          onConfirm={handlePromptConfirm}
          onCancel={handlePromptCancel}
        />
      )}
    </div>
  );
};
