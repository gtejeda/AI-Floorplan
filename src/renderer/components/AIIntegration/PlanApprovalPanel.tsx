/**
 * PlanApprovalPanel Component
 * Displays generated AI subdivision plan with validation results
 * Provides approve/reject actions for user review
 */

import React, { useState } from 'react';
import type { AISubdivisionPlan } from '../../models/AISubdivisionPlan';
import {
  formatPlanSummary,
  getValidationBadgeColor,
  canApprovePlan,
} from '../../services/ai-subdivision-service';
import './PlanApprovalPanel.css';

export interface PlanApprovalPanelProps {
  plan: AISubdivisionPlan;
  onApprove: (planId: string) => Promise<void>;
  onReject: (planId: string, reason?: string) => Promise<void>;
  onRegenerate?: () => void;
}

export const PlanApprovalPanel: React.FC<PlanApprovalPanelProps> = ({
  plan,
  onApprove,
  onReject,
  onRegenerate,
}) => {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove(plan.id);
    } catch (error) {
      console.error('Approval failed:', error);
      alert('Failed to approve plan. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await onReject(plan.id, rejectionReason || undefined);
      setShowRejectDialog(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Rejection failed:', error);
      alert('Failed to reject plan. Please try again.');
    } finally {
      setIsRejecting(false);
    }
  };

  const validationBadgeColor = getValidationBadgeColor(plan.validationStatus);
  const isApprovalAllowed = canApprovePlan(plan);

  return (
    <div className="plan-approval-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="header-content">
          <h3>📋 Generated Subdivision Plan</h3>
          <div className="plan-metadata">
            <span className="metadata-item">
              <span className="icon">🕒</span>
              {new Date(plan.generatedAt).toLocaleString()}
            </span>
            {plan.generationTimeMs && (
              <span className="metadata-item">
                <span className="icon">⚡</span>
                {(plan.generationTimeMs / 1000).toFixed(1)}s
              </span>
            )}
            <span className={`validation-badge ${validationBadgeColor}`}>
              {plan.validationStatus.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Plan Summary */}
      <div className="plan-summary">
        <div className="summary-metrics">
          <div className="metric-card primary">
            <div className="metric-value">{plan.plan.metrics.viableLots}</div>
            <div className="metric-label">Viable Lots</div>
            <div className="metric-subtext">≥ 90 sqm each</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{plan.plan.metrics.totalLots}</div>
            <div className="metric-label">Total Lots</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{plan.plan.metrics.averageLotSizeSqm.toFixed(0)}</div>
            <div className="metric-label">Avg Size (sqm)</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">
              {plan.plan.metrics.landUtilizationPercent.toFixed(1)}%
            </div>
            <div className="metric-label">Utilization</div>
          </div>
        </div>
      </div>

      {/* Layout Details */}
      <div className="plan-details">
        <div className="detail-section">
          <h4>Road Configuration</h4>
          <div className="detail-content">
            <div className="detail-row">
              <span className="detail-label">Layout Type:</span>
              <span className="detail-value">{plan.plan.roadConfiguration.layout}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Width:</span>
              <span className="detail-value">{plan.plan.roadConfiguration.widthMeters}m</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Total Area:</span>
              <span className="detail-value">
                {plan.plan.roadConfiguration.totalAreaSqm.toFixed(0)} sqm
              </span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h4>Amenities</h4>
          <div className="detail-content">
            {plan.plan.amenityAreas.map((amenity, index) => (
              <div key={index} className="detail-row">
                <span className="detail-label">{amenity.type}:</span>
                <span className="detail-value">{amenity.areaSqm.toFixed(0)} sqm</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {plan.validationErrors && plan.validationErrors.length > 0 && (
        <div className="validation-messages errors">
          <div className="message-header">
            <span className="icon">❌</span>
            <strong>Validation Errors</strong>
          </div>
          <ul>
            {plan.validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Validation Warnings */}
      {plan.validationWarnings && plan.validationWarnings.length > 0 && (
        <div className="validation-messages warnings">
          <div className="message-header">
            <span className="icon">⚠️</span>
            <strong>Warnings</strong>
          </div>
          <ul>
            {plan.validationWarnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        {!plan.approvedByUser ? (
          <>
            <button
              type="button"
              className="btn-approve"
              onClick={handleApprove}
              disabled={!isApprovalAllowed || isApproving}
            >
              {isApproving ? (
                <>
                  <span className="spinner"></span>
                  Approving...
                </>
              ) : (
                <>
                  <span className="icon">✓</span>
                  Approve Plan
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-reject"
              onClick={() => setShowRejectDialog(true)}
              disabled={isRejecting}
            >
              <span className="icon">✗</span>
              Reject
            </button>

            {onRegenerate && (
              <button
                type="button"
                className="btn-regenerate"
                onClick={onRegenerate}
                disabled={isApproving || isRejecting}
              >
                <span className="icon">🔄</span>
                Generate New Plan
              </button>
            )}
          </>
        ) : (
          <div className="approved-status">
            <span className="icon">✅</span>
            <span className="text">
              Plan Approved
              {plan.approvedAt && ` on ${new Date(plan.approvedAt).toLocaleString()}`}
            </span>
          </div>
        )}
      </div>

      {/* Rejection Dialog */}
      {showRejectDialog && (
        <div className="modal-overlay" onClick={() => setShowRejectDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Reject Subdivision Plan</h3>
            <p>Please provide a reason for rejection (optional):</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Lot sizes too small, poor road layout, social club area needs relocation..."
              rows={4}
              maxLength={500}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason('');
                }}
                disabled={isRejecting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-confirm-reject"
                onClick={handleReject}
                disabled={isRejecting}
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Info */}
      {!isApprovalAllowed && !plan.approvedByUser && (
        <div className="help-info">
          <span className="icon">ℹ️</span>
          <span>
            This plan contains validation errors and cannot be approved. Please generate a new plan
            or adjust input parameters.
          </span>
        </div>
      )}
    </div>
  );
};
