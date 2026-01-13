import React from 'react';
import './CostWarningModal.css';

export interface CostWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  estimatedCost: number;
  operationType: 'subdivision-plan' | 'image-generation' | 'batch-generation';
  currentSessionCost?: number;
  maxSessionCost?: number;
}

/**
 * Cost Warning Modal for expensive operations
 * Prompts user before proceeding with costly AI operations
 */
export function CostWarningModal({
  isOpen,
  onClose,
  onConfirm,
  estimatedCost,
  operationType,
  currentSessionCost = 0,
  maxSessionCost,
}: CostWarningModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  const totalCost = currentSessionCost + estimatedCost;
  const wouldExceedLimit = maxSessionCost && totalCost > maxSessionCost;

  const operationNames = {
    'subdivision-plan': 'Generate Subdivision Plan',
    'image-generation': 'Generate Project Visualization',
    'batch-generation': 'Generate Multiple Plans',
  };

  const operationDescriptions = {
    'subdivision-plan':
      'This will use AI to generate a subdivision plan with lot layouts, roads, and amenities.',
    'image-generation':
      'This will generate high-quality architectural visualizations of your project.',
    'batch-generation': 'This will generate multiple subdivision plan options for comparison.',
  };

  return (
    <div className="cost-warning-modal__overlay" onClick={onClose}>
      <div
        className="cost-warning-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cost-warning-title"
      >
        <div className="cost-warning-modal__header">
          <h3 className="cost-warning-modal__title" id="cost-warning-title">
            💰 AI Operation Cost Estimate
          </h3>
          <button className="cost-warning-modal__close" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>

        <div className="cost-warning-modal__content">
          <div className="cost-warning-modal__operation">
            <strong>{operationNames[operationType]}</strong>
            <p>{operationDescriptions[operationType]}</p>
          </div>

          <div className="cost-warning-modal__costs">
            <div className="cost-warning-modal__row">
              <span>Estimated operation cost:</span>
              <span className="cost-warning-modal__value">${estimatedCost.toFixed(4)}</span>
            </div>

            <div className="cost-warning-modal__row">
              <span>Current session cost:</span>
              <span className="cost-warning-modal__value">${currentSessionCost.toFixed(4)}</span>
            </div>

            <div className="cost-warning-modal__row cost-warning-modal__row--total">
              <span>Total after operation:</span>
              <span className="cost-warning-modal__value cost-warning-modal__value--bold">
                ${totalCost.toFixed(4)}
              </span>
            </div>

            {maxSessionCost && (
              <div className="cost-warning-modal__row">
                <span>Session limit:</span>
                <span className="cost-warning-modal__value">${maxSessionCost.toFixed(2)}</span>
              </div>
            )}
          </div>

          {wouldExceedLimit && (
            <div className="cost-warning-modal__alert cost-warning-modal__alert--error">
              🚨 This operation would exceed your session cost limit!
            </div>
          )}

          {estimatedCost > 0.01 && !wouldExceedLimit && (
            <div className="cost-warning-modal__alert cost-warning-modal__alert--warning">
              ⚠️ This is a paid operation and will incur charges.
            </div>
          )}

          {estimatedCost === 0 && (
            <div className="cost-warning-modal__alert cost-warning-modal__alert--info">
              ℹ️ This operation uses the free tier - no charges expected.
            </div>
          )}
        </div>

        <div className="cost-warning-modal__actions">
          <button
            className="cost-warning-modal__button cost-warning-modal__button--secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="cost-warning-modal__button cost-warning-modal__button--primary"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            disabled={wouldExceedLimit}
          >
            {wouldExceedLimit ? 'Limit Exceeded' : 'Proceed'}
          </button>
        </div>
      </div>
    </div>
  );
}
