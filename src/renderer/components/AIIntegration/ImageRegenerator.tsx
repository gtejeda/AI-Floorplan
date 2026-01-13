/**
 * ImageRegenerator Component
 *
 * Allows users to regenerate images with custom feedback and refinements.
 * Displays original prompt with editable refinements.
 */

import React, { useState } from 'react';
import type { ViewType } from '../../models/ProjectVisualization';
import './ImageRegenerator.css';

interface ImageRegeneratorProps {
  viewType: ViewType;
  originalPrompt: string;
  isGenerating: boolean;
  onRegenerate: (viewType: ViewType, customRefinements: string) => Promise<void>;
  onCancel?: () => void;
}

export function ImageRegenerator({
  viewType,
  originalPrompt,
  isGenerating,
  onRegenerate,
  onCancel,
}: ImageRegeneratorProps) {
  const [refinements, setRefinements] = useState('');
  const [showOriginalPrompt, setShowOriginalPrompt] = useState(false);

  const handleRegenerate = async () => {
    await onRegenerate(viewType, refinements);
  };

  const viewTypeLabels: Record<ViewType, string> = {
    'site-plan': 'Site Plan View',
    aerial: 'Aerial View',
    context: 'Context View',
    custom: 'Custom View',
  };

  const placeholderText = `Example refinements:
- "Make the social club more prominent"
- "Add more tropical landscaping"
- "Show the pools in more detail"
- "Emphasize the lot boundaries"`;

  return (
    <div className="image-regenerator">
      <div className="regenerator-header">
        <h3>Regenerate {viewTypeLabels[viewType]}</h3>
        <p className="regenerator-subtitle">Provide feedback to refine the AI-generated image</p>
      </div>

      <div className="regenerator-content">
        <div className="prompt-section">
          <div className="prompt-header">
            <label className="prompt-label">Original AI Prompt</label>
            <button
              className="btn-toggle-prompt"
              onClick={() => setShowOriginalPrompt(!showOriginalPrompt)}
              type="button"
            >
              {showOriginalPrompt ? 'Hide' : 'Show'} Original Prompt
            </button>
          </div>

          {showOriginalPrompt && (
            <div className="original-prompt">
              <pre>{originalPrompt}</pre>
            </div>
          )}
        </div>

        <div className="refinements-section">
          <label htmlFor="refinements" className="refinements-label">
            Custom Refinements
            <span className="label-hint">(What would you like to change or emphasize?)</span>
          </label>
          <textarea
            id="refinements"
            className="refinements-textarea"
            value={refinements}
            onChange={(e) => setRefinements(e.target.value)}
            placeholder={placeholderText}
            rows={6}
            disabled={isGenerating}
          />
          <div className="character-count">{refinements.length} / 500 characters</div>
        </div>

        <div className="regenerator-examples">
          <h4>Example Refinements:</h4>
          <ul className="examples-list">
            <li
              className="example-item"
              onClick={() =>
                setRefinements(
                  'Make the social club building more prominent with a distinctive architectural style'
                )
              }
              role="button"
              tabIndex={0}
            >
              "Make the social club building more prominent with a distinctive architectural style"
            </li>
            <li
              className="example-item"
              onClick={() =>
                setRefinements(
                  'Add more tropical palm trees and lush landscaping throughout the subdivision'
                )
              }
              role="button"
              tabIndex={0}
            >
              "Add more tropical palm trees and lush landscaping throughout the subdivision"
            </li>
            <li
              className="example-item"
              onClick={() =>
                setRefinements(
                  'Emphasize the swimming pool with crystal blue water and deck chairs'
                )
              }
              role="button"
              tabIndex={0}
            >
              "Emphasize the swimming pool with crystal blue water and deck chairs"
            </li>
            {viewType === 'site-plan' && (
              <li
                className="example-item"
                onClick={() =>
                  setRefinements('Show lot dimensions more clearly with labeled measurements')
                }
                role="button"
                tabIndex={0}
              >
                "Show lot dimensions more clearly with labeled measurements"
              </li>
            )}
            {viewType === 'aerial' && (
              <li
                className="example-item"
                onClick={() =>
                  setRefinements(
                    'Include more surrounding context showing nearby streets and buildings'
                  )
                }
                role="button"
                tabIndex={0}
              >
                "Include more surrounding context showing nearby streets and buildings"
              </li>
            )}
            {viewType === 'context' && (
              <li
                className="example-item"
                onClick={() =>
                  setRefinements('Show the project during golden hour with warm sunset lighting')
                }
                role="button"
                tabIndex={0}
              >
                "Show the project during golden hour with warm sunset lighting"
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="regenerator-footer">
        {isGenerating ? (
          <div className="generating-status">
            <div className="status-spinner"></div>
            <span>Generating new image...</span>
          </div>
        ) : (
          <div className="regenerator-actions">
            {onCancel && (
              <button className="btn-cancel" onClick={onCancel} type="button">
                Cancel
              </button>
            )}
            <button
              className="btn-regenerate"
              onClick={handleRegenerate}
              disabled={!refinements.trim()}
              type="button"
            >
              Regenerate Image
            </button>
          </div>
        )}
      </div>

      {isGenerating && (
        <div className="progress-overlay">
          <div className="progress-message">
            <div className="progress-spinner"></div>
            <p>Generating new image with your refinements...</p>
            <p className="progress-hint">This may take 30-90 seconds</p>
          </div>
        </div>
      )}
    </div>
  );
}
