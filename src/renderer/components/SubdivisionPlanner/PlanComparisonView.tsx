/**
 * PlanComparisonView Component
 * Compare multiple AI-generated subdivision plans side-by-side
 * Phase 5: User Story 3 (T123-T128)
 */

import React, { useState, useMemo } from 'react';
import type { AISubdivisionPlan } from '../../models/AISubdivisionPlan';
import {
  calculateComparisonMetrics,
  rankPlans,
  formatPlanSummary,
  type ComparisonMetrics,
  type PlanRanking,
} from '../../services/ai-subdivision-service';
import './PlanComparisonView.css';

export interface PlanComparisonViewProps {
  plans: AISubdivisionPlan[];
  selectedPlanId: string | null;
  inputLandArea: number;
  pricePerSqm?: number;
  onSelectPlan: (planId: string) => void;
  onActivatePlan: () => void;
  onRequestMoreOptions: () => void;
  isLoading?: boolean;
}

/**
 * T123: PlanComparisonView component skeleton
 */
export function PlanComparisonView({
  plans,
  selectedPlanId,
  inputLandArea,
  pricePerSqm,
  onSelectPlan,
  onActivatePlan,
  onRequestMoreOptions,
  isLoading = false,
}: PlanComparisonViewProps) {
  const [sortBy, setSortBy] = useState<keyof ComparisonMetrics>('viableLots');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // T124: Calculate rankings for all plans
  const rankings = useMemo(
    () => rankPlans(plans, inputLandArea, pricePerSqm),
    [plans, inputLandArea, pricePerSqm]
  );

  // Sort plans based on user selection
  const sortedRankings = useMemo(() => {
    const sorted = [...rankings];
    sorted.sort((a, b) => {
      const aValue = a.metrics[sortBy];
      const bValue = b.metrics[sortBy];
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [rankings, sortBy, sortOrder]);

  const handleSort = (metric: keyof ComparisonMetrics) => {
    if (sortBy === metric) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(metric);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (metric: keyof ComparisonMetrics) => {
    if (sortBy !== metric) return '⇅';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  if (isLoading) {
    return (
      <div className="plan-comparison-loading">
        <div className="loading-spinner" />
        <p>Generating multiple subdivision plans...</p>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="plan-comparison-empty">
        <p>No plans to compare.</p>
        <button onClick={onRequestMoreOptions} className="btn btn-primary">
          Generate Plans
        </button>
      </div>
    );
  }

  return (
    <div className="plan-comparison-view">
      <div className="comparison-header">
        <h3>Compare Subdivision Plans</h3>
        <p className="subtitle">{plans.length} options generated for your review</p>
      </div>

      {/* T124: Comparison table with metrics */}
      <div className="comparison-table-container">
        <table className="comparison-table">
          <thead>
            <tr>
              <th className="col-select">
                {/* T125: Plan selection radio buttons */}
                Select
              </th>
              <th className="col-rank">Rank</th>
              <th className="col-sortable" onClick={() => handleSort('lotCount')}>
                Total Lots {getSortIcon('lotCount')}
              </th>
              <th className="col-sortable" onClick={() => handleSort('viableLots')}>
                Viable Lots {getSortIcon('viableLots')}
              </th>
              <th className="col-sortable" onClick={() => handleSort('averageLotSizeSqm')}>
                Avg Size (sqm) {getSortIcon('averageLotSizeSqm')}
              </th>
              <th className="col-sortable" onClick={() => handleSort('landUtilizationPercent')}>
                Land Use (%) {getSortIcon('landUtilizationPercent')}
              </th>
              <th className="col-sortable" onClick={() => handleSort('roadAreaPercent')}>
                Road (%) {getSortIcon('roadAreaPercent')}
              </th>
              {pricePerSqm && (
                <th className="col-sortable" onClick={() => handleSort('estimatedRevenue')}>
                  Est. Revenue {getSortIcon('estimatedRevenue')}
                </th>
              )}
              <th className="col-highlights">Highlights</th>
            </tr>
          </thead>
          <tbody>
            {sortedRankings.map((ranking) => {
              const plan = plans.find((p) => p.id === ranking.planId)!;
              const isSelected = plan.id === selectedPlanId;

              return (
                <tr
                  key={plan.id}
                  className={`plan-row ${isSelected ? 'selected' : ''} ${
                    ranking.rank === 1 ? 'recommended' : ''
                  }`}
                  onClick={() => onSelectPlan(plan.id)}
                >
                  {/* T125: Radio button for selection */}
                  <td className="col-select">
                    <input
                      type="radio"
                      name="selectedPlan"
                      checked={isSelected}
                      onChange={() => onSelectPlan(plan.id)}
                      aria-label={`Select Plan ${ranking.rank}`}
                    />
                  </td>

                  <td className="col-rank">
                    {ranking.rank === 1 && <span className="rank-badge recommended">★ Best</span>}
                    {ranking.rank > 1 && <span className="rank-badge">#{ranking.rank}</span>}
                  </td>

                  {/* T126: Key metrics display */}
                  <td className="col-metric">{ranking.metrics.lotCount}</td>
                  <td className="col-metric">
                    <span className="metric-value">{ranking.metrics.viableLots}</span>
                    {ranking.metrics.viableLots !== ranking.metrics.lotCount && (
                      <span className="metric-note">
                        ({ranking.metrics.lotCount - ranking.metrics.viableLots} invalid)
                      </span>
                    )}
                  </td>
                  <td className="col-metric">{ranking.metrics.averageLotSizeSqm.toFixed(1)}</td>
                  <td className="col-metric">
                    <MetricWithDiffIndicator
                      value={ranking.metrics.landUtilizationPercent}
                      format={(v) => `${v.toFixed(1)}%`}
                      goodRange={[80, 100]}
                    />
                  </td>
                  <td className="col-metric">
                    <MetricWithDiffIndicator
                      value={ranking.metrics.roadAreaPercent}
                      format={(v) => `${v.toFixed(1)}%`}
                      goodRange={[10, 18]}
                    />
                  </td>

                  {pricePerSqm && ranking.metrics.estimatedRevenue && (
                    <td className="col-metric">
                      ${ranking.metrics.estimatedRevenue.toLocaleString()}
                    </td>
                  )}

                  <td className="col-highlights">
                    <div className="highlights-list">
                      {ranking.highlights.slice(0, 2).map((highlight, i) => (
                        <span key={i} className="highlight-badge">
                          ✓ {highlight}
                        </span>
                      ))}
                      {ranking.concerns.length > 0 && (
                        <span className="concern-badge">⚠ {ranking.concerns[0]}</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* T127: Action buttons */}
      <div className="comparison-actions">
        <button onClick={onRequestMoreOptions} className="btn btn-secondary" disabled={isLoading}>
          Request More Options
        </button>

        <button
          onClick={onActivatePlan}
          className="btn btn-primary"
          disabled={!selectedPlanId || isLoading}
        >
          Select as Active Plan
        </button>
      </div>

      {/* T126: Selected plan detail view */}
      {selectedPlanId && (
        <SelectedPlanDetails
          plan={plans.find((p) => p.id === selectedPlanId)!}
          ranking={rankings.find((r) => r.planId === selectedPlanId)!}
          inputLandArea={inputLandArea}
        />
      )}
    </div>
  );
}

/**
 * Helper component: Metric value with visual indicator (T126)
 */
function MetricWithDiffIndicator({
  value,
  format,
  goodRange,
}: {
  value: number;
  format: (v: number) => string;
  goodRange: [number, number];
}) {
  const isGood = value >= goodRange[0] && value <= goodRange[1];
  const className = isGood ? 'metric-good' : 'metric-neutral';

  return <span className={className}>{format(value)}</span>;
}

/**
 * Selected plan detailed view (T126)
 */
function SelectedPlanDetails({
  plan,
  ranking,
  inputLandArea,
}: {
  plan: AISubdivisionPlan;
  ranking: PlanRanking;
  inputLandArea: number;
}) {
  return (
    <div className="selected-plan-details">
      <h4>Selected Plan Details</h4>

      <div className="details-grid">
        <div className="detail-section">
          <h5>Plan Configuration</h5>
          <dl>
            <dt>Road Layout:</dt>
            <dd>{plan.plan.roadConfiguration.layout}</dd>

            <dt>Social Club Area:</dt>
            <dd>{ranking.metrics.socialClubAreaSqm.toFixed(0)} sqm</dd>

            <dt>Road Coverage:</dt>
            <dd>
              {plan.plan.roadConfiguration.totalAreaSqm.toFixed(0)} sqm (
              {ranking.metrics.roadAreaPercent.toFixed(1)}%)
            </dd>
          </dl>
        </div>

        <div className="detail-section">
          <h5>Strengths</h5>
          <ul className="highlights-list">
            {ranking.highlights.map((highlight, i) => (
              <li key={i} className="highlight-item">
                ✓ {highlight}
              </li>
            ))}
            {ranking.highlights.length === 0 && (
              <li className="muted">No standout strengths identified</li>
            )}
          </ul>
        </div>

        <div className="detail-section">
          <h5>Considerations</h5>
          <ul className="concerns-list">
            {ranking.concerns.map((concern, i) => (
              <li key={i} className="concern-item">
                ⚠ {concern}
              </li>
            ))}
            {ranking.concerns.length === 0 && <li className="muted">No significant concerns</li>}
          </ul>
        </div>

        <div className="detail-section">
          <h5>Validation Status</h5>
          <div className={`validation-badge ${plan.validationStatus}`}>{plan.validationStatus}</div>
          {plan.validationWarnings && plan.validationWarnings.length > 0 && (
            <ul className="validation-warnings">
              {plan.validationWarnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
