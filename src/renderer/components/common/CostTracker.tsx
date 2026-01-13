import React, { useEffect, useState } from 'react';
import './CostTracker.css';

export interface CostBreakdown {
  geminiCalls: number;
  imageCalls: number;
  totalTokens: number;
  estimatedCostUSD: number;
  geminiCost: number;
  imageCost: number;
}

export interface CostTrackerProps {
  projectId?: string;
  collapsed?: boolean;
  showWarnings?: boolean;
  maxCostPerSession?: number;
}

/**
 * Cost Tracker component showing session cost
 * Displays AI API usage and estimated costs
 */
export function CostTracker({
  projectId,
  collapsed = false,
  showWarnings = true,
  maxCostPerSession,
}: CostTrackerProps): JSX.Element {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [costData, setCostData] = useState<CostBreakdown>({
    geminiCalls: 0,
    imageCalls: 0,
    totalTokens: 0,
    estimatedCostUSD: 0,
    geminiCost: 0,
    imageCost: 0,
  });

  useEffect(() => {
    // Fetch cost data from IPC
    const fetchCostData = async () => {
      try {
        const data = await window.aiService.getSessionCost(projectId);
        setCostData(data);
      } catch (error) {
        console.error('Failed to fetch cost data:', error);
      }
    };

    fetchCostData();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchCostData, 5000);

    return () => clearInterval(interval);
  }, [projectId]);

  const isApproachingLimit =
    showWarnings && maxCostPerSession && costData.estimatedCostUSD > maxCostPerSession * 0.8;
  const hasExceededLimit = maxCostPerSession && costData.estimatedCostUSD >= maxCostPerSession;

  return (
    <div className={`cost-tracker ${isCollapsed ? 'cost-tracker--collapsed' : ''}`}>
      <button
        className="cost-tracker__toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-expanded={!isCollapsed}
      >
        <span className="cost-tracker__title">
          💰 Session Cost: ${costData.estimatedCostUSD.toFixed(4)}
        </span>
        <span className={`cost-tracker__arrow ${isCollapsed ? '' : 'cost-tracker__arrow--open'}`}>
          ▼
        </span>
      </button>

      {!isCollapsed && (
        <div className="cost-tracker__content">
          {/* Warning banner */}
          {isApproachingLimit && !hasExceededLimit && (
            <div className="cost-tracker__warning cost-tracker__warning--warning">
              ⚠️ Approaching cost limit (
              {((costData.estimatedCostUSD / (maxCostPerSession || 1)) * 100).toFixed(0)}%)
            </div>
          )}

          {hasExceededLimit && (
            <div className="cost-tracker__warning cost-tracker__warning--error">
              🚨 Session cost limit exceeded!
            </div>
          )}

          {/* Cost breakdown */}
          <div className="cost-tracker__breakdown">
            <div className="cost-tracker__section">
              <h4 className="cost-tracker__section-title">API Calls</h4>
              <div className="cost-tracker__row">
                <span className="cost-tracker__label">Gemini (Text):</span>
                <span className="cost-tracker__value">{costData.geminiCalls}</span>
              </div>
              <div className="cost-tracker__row">
                <span className="cost-tracker__label">Images:</span>
                <span className="cost-tracker__value">{costData.imageCalls}</span>
              </div>
            </div>

            <div className="cost-tracker__section">
              <h4 className="cost-tracker__section-title">Tokens Used</h4>
              <div className="cost-tracker__row">
                <span className="cost-tracker__label">Total:</span>
                <span className="cost-tracker__value">{costData.totalTokens.toLocaleString()}</span>
              </div>
            </div>

            <div className="cost-tracker__section">
              <h4 className="cost-tracker__section-title">Cost Breakdown</h4>
              <div className="cost-tracker__row">
                <span className="cost-tracker__label">Gemini:</span>
                <span className="cost-tracker__value">${costData.geminiCost.toFixed(4)}</span>
              </div>
              <div className="cost-tracker__row">
                <span className="cost-tracker__label">Images:</span>
                <span className="cost-tracker__value">${costData.imageCost.toFixed(4)}</span>
              </div>
              <div className="cost-tracker__row cost-tracker__row--total">
                <span className="cost-tracker__label">Total:</span>
                <span className="cost-tracker__value">${costData.estimatedCostUSD.toFixed(4)}</span>
              </div>

              {maxCostPerSession && (
                <div className="cost-tracker__row">
                  <span className="cost-tracker__label">Limit:</span>
                  <span className="cost-tracker__value">${maxCostPerSession.toFixed(2)}</span>
                </div>
              )}
            </div>

            {costData.estimatedCostUSD === 0 && (
              <div className="cost-tracker__free-tier">🎉 Using free tier - no charges</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
