/**
 * PromptEditorModal Component
 *
 * Allows users to preview and edit AI image generation prompts before sending
 */

import React, { useState, useEffect } from 'react';
import type { ViewType } from '../../models/ProjectVisualization';

interface PromptEditorModalProps {
  // Support both naming conventions for compatibility
  isOpen?: boolean;
  viewType?: ViewType;
  initialPrompt?: string;
  prompt?: string; // Alternative prop name for prompt
  title?: string; // Custom title
  isGenerating?: boolean; // Show loading state on confirm button
  confirmButtonText?: string; // Custom confirm button text (default: "Generate Image")
  onConfirm: (editedPrompt: string) => void;
  onCancel: () => void;
}

export function PromptEditorModal({
  isOpen = true, // Default to true if not provided
  viewType,
  initialPrompt,
  prompt,
  title,
  isGenerating = false,
  confirmButtonText = 'Generate Image',
  onConfirm,
  onCancel,
}: PromptEditorModalProps) {
  // Support both prop names
  const actualPrompt = prompt || initialPrompt || '';
  const [editedPrompt, setEditedPrompt] = useState(actualPrompt);

  // Update edited prompt when prompt changes
  useEffect(() => {
    setEditedPrompt(actualPrompt);
  }, [actualPrompt]);

  if (!isOpen) return null;

  const viewTypeLabels: Record<ViewType, string> = {
    'site-plan': 'Site Plan View',
    aerial: 'Aerial View',
    context: 'Context View',
    custom: 'Custom View',
  };

  // Determine header title and subtitle
  const headerTitle = title || 'Edit Image Generation Prompt';
  const headerSubtitle = viewType ? viewTypeLabels[viewType] : undefined;

  return (
    <div className="prompt-editor-overlay" onClick={onCancel}>
      <div className="prompt-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="prompt-editor-header">
          <h2>{headerTitle}</h2>
          {headerSubtitle && <h3>{headerSubtitle}</h3>}
          <button className="modal-close-btn" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="prompt-editor-body">
          <p className="prompt-editor-description">
            Review and customize the AI prompt below. The prompt describes what the AI will
            generate. You can add specific requirements or adjust the description as needed.
          </p>

          <textarea
            className="prompt-editor-textarea"
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            rows={12}
            placeholder="Enter your image generation prompt..."
          />

          <div className="prompt-editor-stats">
            <span className="char-count">{editedPrompt.length} characters</span>
            <span className="word-count">
              {editedPrompt.split(/\s+/).filter((w) => w.length > 0).length} words
            </span>
          </div>
        </div>

        <div className="prompt-editor-footer">
          <button className="btn-secondary" onClick={onCancel} disabled={isGenerating}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => onConfirm(editedPrompt)}
            disabled={!editedPrompt.trim() || isGenerating}
          >
            {isGenerating ? 'Generating...' : confirmButtonText}
          </button>
        </div>
      </div>

      <style>{`
        .prompt-editor-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .prompt-editor-modal {
          background: white;
          border-radius: 12px;
          max-width: 800px;
          width: 90%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .prompt-editor-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          position: relative;
        }

        .prompt-editor-header h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
          color: #1f2937;
        }

        .prompt-editor-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 500;
          color: #6b7280;
        }

        .modal-close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .modal-close-btn:hover {
          background: #f3f4f6;
          color: #1f2937;
        }

        .prompt-editor-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }

        .prompt-editor-description {
          margin: 0 0 1rem 0;
          color: #6b7280;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .prompt-editor-textarea {
          width: 100%;
          padding: 1rem;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.95rem;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          resize: vertical;
          transition: border-color 0.2s;
        }

        .prompt-editor-textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .prompt-editor-stats {
          display: flex;
          gap: 1.5rem;
          margin-top: 0.75rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .prompt-editor-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }

        .btn-primary,
        .btn-secondary {
          padding: 0.625rem 1.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }
      `}</style>
    </div>
  );
}
