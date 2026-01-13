/**
 * PlanComparisonTable Component
 *
 * Displays side-by-side comparison of multiple AI-generated subdivision plans
 * Allows user to select preferred plan from alternatives
 */

import React from 'react';
import type { AISubdivisionPlan } from '../../models/AISubdivisionPlan';
import './PlanComparisonTable.css';

export interface PlanComparisonTableProps {
  plans: AISubdivisionPlan[];
  selectedPlanId?: string;
  onSelectPlan: (planId: string) => void;
}

/**
 * Renders comparison table with key metrics for each plan
 */
export function PlanComparisonTable({
  plans,
  selectedPlanId,
  onSelectPlan,
}: PlanComparisonTableProps) {
  if (plans.length === 0) {
    return (
      <div className="plan-comparison-empty">
        <p>No plans available for comparison</p>
      </div>
    );
  }

  return (
    <div className="plan-comparison-table">
      <h3 className="comparison-title">Compare Subdivision Plans ({plans.length} options)</h3>

      <table className="comparison-table">
        <thead>
          <tr>
            <th className="metric-column">Metric</th>
            {plans.map((plan, index) => (
              <th key={plan.id} className="plan-column">
                Option {index + 1}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Selection Row */}
          <tr className="selection-row">
            <td className="metric-label">Select</td>
            {plans.map((plan) => (
              <td key={plan.id} className="plan-value">
                <input
                  type="radio"
                  name="selected-plan"
                  value={plan.id}
                  checked={selectedPlanId === plan.id}
                  onChange={() => onSelectPlan(plan.id)}
                  className="plan-radio"
                />
              </td>
            ))}
          </tr>

          {/* Total Lot Count */}
          <tr>
            <td className="metric-label">Total Lots</td>
            {plans.map((plan) => {
              const planData = JSON.parse(plan.planJson);
              return (
                <td key={plan.id} className="plan-value">
                  <strong>{planData.metrics.totalLots}</strong>
                </td>
              );
            })}
          </tr>

          {/* Viable Lots */}
          <tr>
            <td className="metric-label">Viable Lots (≥90 sqm)</td>
            {plans.map((plan) => {
              const planData = JSON.parse(plan.planJson);
              const isValid = planData.metrics.viableLots === planData.metrics.totalLots;
              return (
                <td
                  key={plan.id}
                  className={`plan-value ${isValid ? 'value-good' : 'value-warning'}`}
                >
                  {planData.metrics.viableLots}
                  {!isValid && ` ⚠️`}
                </td>
              );
            })}
          </tr>

          {/* Average Lot Size */}
          <tr>
            <td className="metric-label">Average Lot Size</td>
            {plans.map((plan) => {
              const planData = JSON.parse(plan.planJson);
              return (
                <td key={plan.id} className="plan-value">
                  {planData.metrics.averageLotSizeSqm.toFixed(1)} sqm
                </td>
              );
            })}
          </tr>

          {/* Land Utilization */}
          <tr>
            <td className="metric-label">Land Utilization</td>
            {plans.map((plan) => {
              const planData = JSON.parse(plan.planJson);
              const utilization = planData.metrics.landUtilizationPercent;
              const isOptimal = utilization >= 40 && utilization <= 75;
              return (
                <td
                  key={plan.id}
                  className={`plan-value ${isOptimal ? 'value-good' : 'value-info'}`}
                >
                  {utilization.toFixed(1)}%
                </td>
              );
            })}
          </tr>

          {/* Road Coverage */}
          <tr>
            <td className="metric-label">Road Coverage</td>
            {plans.map((plan) => {
              const planData = JSON.parse(plan.planJson);
              const roadPercent =
                (planData.roadConfiguration.totalAreaSqm / plan.inputLandArea) * 100;
              const isGood = roadPercent < 20;
              return (
                <td
                  key={plan.id}
                  className={`plan-value ${isGood ? 'value-good' : 'value-warning'}`}
                >
                  {roadPercent.toFixed(1)}%
                </td>
              );
            })}
          </tr>

          {/* Amenity Percentage */}
          <tr>
            <td className="metric-label">Amenity Areas</td>
            {plans.map((plan) => {
              const planData = JSON.parse(plan.planJson);
              const totalAmenities = planData.amenityAreas.reduce(
                (sum: number, amenity: any) => sum + amenity.areaSqm,
                0
              );
              const amenityPercent = (totalAmenities / plan.inputLandArea) * 100;
              return (
                <td key={plan.id} className="plan-value">
                  {amenityPercent.toFixed(1)}%
                </td>
              );
            })}
          </tr>

          {/* Road Layout */}
          <tr>
            <td className="metric-label">Road Layout</td>
            {plans.map((plan) => {
              const planData = JSON.parse(plan.planJson);
              return (
                <td key={plan.id} className="plan-value">
                  {planData.roadConfiguration.layout}
                </td>
              );
            })}
          </tr>

          {/* Generation Time */}
          <tr>
            <td className="metric-label">Generation Time</td>
            {plans.map((plan) => (
              <td key={plan.id} className="plan-value text-muted">
                {plan.generationTimeMs ? `${(plan.generationTimeMs / 1000).toFixed(1)}s` : 'N/A'}
              </td>
            ))}
          </tr>

          {/* Validation Status */}
          <tr>
            <td className="metric-label">Validation Status</td>
            {plans.map((plan) => {
              const statusClass =
                plan.validationStatus === 'valid'
                  ? 'status-valid'
                  : plan.validationStatus === 'warnings'
                    ? 'status-warnings'
                    : 'status-invalid';

              return (
                <td key={plan.id} className={`plan-value ${statusClass}`}>
                  {plan.validationStatus === 'valid' && '✓ Valid'}
                  {plan.validationStatus === 'warnings' && '⚠️ Warnings'}
                  {plan.validationStatus === 'invalid' && '✗ Invalid'}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>

      <div className="comparison-legend">
        <p className="legend-title">Legend:</p>
        <ul className="legend-list">
          <li>
            <span className="value-good">●</span> Optimal value
          </li>
          <li>
            <span className="value-warning">●</span> Outside recommended range
          </li>
          <li>
            <span className="value-info">●</span> Informational
          </li>
        </ul>
      </div>
    </div>
  );
}
