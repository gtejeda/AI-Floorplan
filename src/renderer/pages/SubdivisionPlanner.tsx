/**
 * SubdivisionPlanner Page (T072 + T160 + AI Subdivision Planning)
 * Page for viewing and selecting subdivision scenarios
 * Phase 4: User Story 2 - Automatic Subdivision Calculation
 * Phase 5: AI-powered subdivision plan generation (US1 MVP)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageManager } from '../components/ImageManager/ImageManager';
import { AIPlanGenerator } from '../components/AIIntegration/AIPlanGenerator';
import { PlanApprovalPanel } from '../components/AIIntegration/PlanApprovalPanel';
import { PlanComparisonView } from '../components/SubdivisionPlanner/PlanComparisonView';
import { VisualizationGallery } from '../components/AIIntegration/VisualizationGallery';
import { useAISubdivisionPlan } from '../hooks/useAISubdivisionPlan';
import { useAIImageGeneration } from '../hooks/useAIImageGeneration';
import type { LandParcel } from '../models/LandParcel';
import type { MultiplePlansRequest } from '../services/ai-subdivision-service';
import type { AISubdivisionPlan } from '../models/AISubdivisionPlan';

interface SubdivisionPlannerProps {
  projectId?: string;
}

export const SubdivisionPlanner: React.FC<SubdivisionPlannerProps> = ({
  projectId: propProjectId,
}) => {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState<string | null>(propProjectId || null);
  const [landParcel, setLandParcel] = useState<LandParcel | null>(null);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [isLoadingLand, setIsLoadingLand] = useState(true);

  // T135: Add comparison mode toggle
  const [comparisonMode, setComparisonMode] = useState(false);

  // T111: Add archived plans modal state
  const [showArchivedPlans, setShowArchivedPlans] = useState(false);
  const [archivedPlans, setArchivedPlans] = useState<AISubdivisionPlan[]>([]);

  // AI subdivision plan hook
  const {
    currentPlan,
    generationState,
    multiplePlans,
    selectedPlanId,
    isGeneratingMultiple,
    generatePlan,
    approvePlan,
    rejectPlan,
    clearCurrentPlan,
    loadActivePlan,
    generateMultiplePlansAction,
    selectPlan,
    activateSelectedPlan,
    clearMultiplePlans,
  } = useAISubdivisionPlan();

  // T091-T093: AI image generation hook
  const imageGeneration = useAIImageGeneration(
    projectId || '',
    currentPlan?.id
  );

  useEffect(() => {
    // Load project ID from localStorage if not provided
    if (!projectId) {
      const savedProjectId = localStorage.getItem('currentProjectId');
      if (savedProjectId) {
        setProjectId(savedProjectId);
      } else {
        // No project found, redirect to setup
        navigate('/');
      }
    }
  }, [projectId, navigate]);

  // Load land parcel data
  useEffect(() => {
    if (projectId) {
      loadLandParcel(projectId);
    }
  }, [projectId]);

  // T037-T038: Auto-load active plan on startup
  useEffect(() => {
    if (projectId) {
      loadActivePlan(projectId);
    }
  }, [projectId, loadActivePlan]);

  const loadLandParcel = async (projId: string) => {
    setIsLoadingLand(true);
    try {
      // First load the project to get the land parcel ID
      const project = await window.electronAPI.loadProject(projId);
      if (project && project.landParcelId) {
        // Then load the land parcel using its ID
        const parcel = await window.electronAPI.loadLandParcel(project.landParcelId);
        setLandParcel(parcel);
      } else {
        console.warn('Project has no land parcel associated');
        setLandParcel(null);
      }
    } catch (error) {
      console.error('Failed to load land parcel:', error);
      setLandParcel(null);
    } finally {
      setIsLoadingLand(false);
    }
  };

  // T135: Handle multi-plan generation
  const handleGenerateMultiplePlans = async () => {
    if (!projectId || !landParcel) return;

    const request: MultiplePlansRequest = {
      projectId,
      landParcelId: landParcel.id,
      landWidth: landParcel.width,
      landLength: landParcel.length,
      landArea: landParcel.area,
      socialClubPercent: 20, // Default 20%
      planCount: 5, // Generate 5 variations
    };

    await generateMultiplePlansAction(request);
  };

  // T135: Handle plan activation
  const handleActivatePlan = async () => {
    if (!projectId) return;
    await activateSelectedPlan(projectId);
    setComparisonMode(false); // Exit comparison mode after activation
  };

  // T111: Load archived plans
  const loadArchivedPlans = async () => {
    if (!projectId) return;
    try {
      const response = await window.aiService.getArchivedPlans({ projectId });
      setArchivedPlans(response.plans || []);
      setShowArchivedPlans(true);
    } catch (error) {
      console.error('Failed to load archived plans:', error);
    }
  };

  // T112: Switch to archived plan
  const handleSwitchToArchivedPlan = async (planId: string) => {
    if (!projectId) return;
    try {
      await window.aiService.switchToArchivedPlan({ planId, projectId });
      // Reload the page to show the newly activated plan
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch to archived plan:', error);
    }
  };

  // T090: Generate images for approved plan
  const handleGenerateImages = async (planId: string) => {
    if (!projectId || !currentPlan) return;

    try {
      // Generate all three view types
      const viewTypes: Array<'site-plan' | 'aerial' | 'context'> = [
        'site-plan',
        'aerial',
        'context',
      ];

      for (const viewType of viewTypes) {
        await imageGeneration.generateImage(viewType, {
          projectId,
          subdivisionPlanId: planId,
          viewType,
          prompt: `Generate a ${viewType} visualization for the approved subdivision plan`,
          negativePrompt: 'blurry, low quality, distorted',
        });
      }

      alert('All project images generated successfully!');
    } catch (error) {
      console.error('Failed to generate images:', error);
      alert('Failed to generate images. Please try again.');
    }
  };

  return (
    <div className="subdivision-planner">
      <div className="page-header">
        <h1>Subdivision Planning</h1>
        <p>Generate AI-powered subdivision layouts optimized for your land parcel</p>

        {/* T135: Mode toggle */}
        {landParcel && !currentPlan && multiplePlans.length === 0 && (
          <div className="mode-toggle">
            <button
              type="button"
              className={!comparisonMode ? 'btn-mode active' : 'btn-mode'}
              onClick={() => setComparisonMode(false)}
            >
              Single Plan
            </button>
            <button
              type="button"
              className={comparisonMode ? 'btn-mode active' : 'btn-mode'}
              onClick={() => setComparisonMode(true)}
            >
              Compare Options
            </button>
          </div>
        )}

        {/* T111: View Archived Plans button */}
        {landParcel && (currentPlan || multiplePlans.length > 0) && (
          <div className="archived-plans-link">
            <button type="button" className="btn-link" onClick={loadArchivedPlans}>
              📁 View Archived Plans
            </button>
          </div>
        )}
      </div>

      {isLoadingLand ? (
        <div className="loading-message">
          <div className="spinner"></div>
          <p>Loading land parcel data...</p>
        </div>
      ) : !landParcel ? (
        <div className="no-land-message">
          <p>No land parcel found for this project.</p>
          <p>Please configure land parcel details first.</p>
          <button type="button" className="btn-primary" onClick={() => navigate('/')}>
            ← Back to Project Setup
          </button>
        </div>
      ) : (
        <>
          {/* T135: Comparison Mode */}
          {comparisonMode && multiplePlans.length === 0 && (
            <div className="comparison-intro">
              <h2>Multi-Plan Comparison</h2>
              <p>
                Generate and compare multiple subdivision options side-by-side. We'll create 5
                different layouts with varying configurations.
              </p>
              <button
                type="button"
                className="btn-primary btn-large"
                onClick={handleGenerateMultiplePlans}
                disabled={isGeneratingMultiple}
              >
                {isGeneratingMultiple ? 'Generating Plans...' : 'Generate 5 Options'}
              </button>
            </div>
          )}

          {/* T135: Plan Comparison View */}
          {comparisonMode && multiplePlans.length > 0 && (
            <PlanComparisonView
              plans={multiplePlans}
              selectedPlanId={selectedPlanId}
              inputLandArea={landParcel.area}
              pricePerSqm={undefined} // TODO: Get from project settings
              onSelectPlan={selectPlan}
              onActivatePlan={handleActivatePlan}
              onRequestMoreOptions={() => {
                clearMultiplePlans();
                handleGenerateMultiplePlans();
              }}
              isLoading={isGeneratingMultiple}
            />
          )}

          {/* Single Plan Mode - AI Plan Generator */}
          {!comparisonMode && !currentPlan && (
            <AIPlanGenerator
              projectId={projectId!}
              landParcelId={landParcel.id}
              landWidth={landParcel.width}
              landLength={landParcel.length}
              landArea={landParcel.area}
              province={landParcel.province?.name}
              generationState={generationState}
              onGenerate={generatePlan}
            />
          )}

          {/* Single Plan Mode - Plan Approval Panel */}
          {!comparisonMode && currentPlan && (
            <PlanApprovalPanel
              plan={currentPlan}
              onApprove={approvePlan}
              onReject={rejectPlan}
              onRegenerate={clearCurrentPlan}
              onGenerateImages={handleGenerateImages}
            />
          )}

          {/* T091-T093: Visualization Gallery - Show when plan is approved */}
          {currentPlan && currentPlan.approvedByUser && projectId && (
            <VisualizationGallery
              visualizations={imageGeneration.visualizations}
              projectId={projectId}
              planId={currentPlan.id}
              isGenerating={{
                sitePlan: imageGeneration.state.sitePlan.isGenerating,
                aerial: imageGeneration.state.aerial.isGenerating,
                context: imageGeneration.state.context.isGenerating,
              }}
              progress={{
                sitePlan: imageGeneration.state.sitePlan.progress,
                aerial: imageGeneration.state.aerial.progress,
                context: imageGeneration.state.context.progress,
              }}
              onRegenerate={async (viewType, customPrompt) => {
                if (!projectId || !currentPlan) return;

                // If custom prompt is provided, use it as fullCustomPrompt
                const request = {
                  projectId,
                  subdivisionPlanId: currentPlan.id,
                  viewType,
                  ...(customPrompt ? { fullCustomPrompt: customPrompt } : {}),
                };

                await imageGeneration.generateImage(viewType, request);
              }}
            />
          )}

          {/* Subdivision visualization placeholder - HIDDEN FOR NOW */}
          {/* {currentPlan && currentPlan.approvedByUser && (
            <div className="subdivision-view-placeholder">
              <p>Select a lot ID to manage its images:</p>

              <div className="lot-selector">
                <label htmlFor="lot-select">Select Lot:</label>
                <input
                  id="lot-select"
                  type="text"
                  placeholder="Enter lot ID"
                  value={selectedLotId || ''}
                  onChange={(e) => setSelectedLotId(e.target.value || null)}
                />
              </div>
            </div>
          )} */}
        </>
      )}

      {/* T160: Integrate ImageManager for lot images - HIDDEN FOR NOW */}
      {/* {projectId && selectedLotId && (
        <div className="image-manager-section">
          <ImageManager projectId={projectId} associationType="lot" lotId={selectedLotId} />
        </div>
      )} */}

      <div className="navigation-actions">
        <button type="button" className="btn-secondary" onClick={() => navigate('/')}>
          ← Back to Project Setup
        </button>

        <button
          type="button"
          className="btn-primary btn-with-badge"
          onClick={() => navigate('/social-club')}
        >
          Next: Social Club Design →
          <span className="feature-badge">Phase 5</span>
        </button>
      </div>

      {/* T111: Archived Plans Modal */}
      {showArchivedPlans && (
        <div className="modal-overlay" onClick={() => setShowArchivedPlans(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Archived Subdivision Plans</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowArchivedPlans(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {archivedPlans.length === 0 ? (
                <p className="text-muted">No archived plans found for this project.</p>
              ) : (
                <div className="archived-plans-list">
                  <table className="archived-plans-table">
                    <thead>
                      <tr>
                        <th>Generated At</th>
                        <th>Total Lots</th>
                        <th>Viable Lots</th>
                        <th>Land Utilization</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archivedPlans.map((plan) => {
                        const planData = JSON.parse(plan.planJson);
                        return (
                          <tr key={plan.id}>
                            <td>
                              {new Date(plan.generatedAt).toLocaleString('en-US', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </td>
                            <td>{planData.metrics.totalLots}</td>
                            <td>{planData.metrics.viableLots}</td>
                            <td>{planData.metrics.landUtilizationPercent.toFixed(1)}%</td>
                            <td>
                              <span className={`status-badge ${plan.validationStatus}`}>
                                {plan.validationStatus}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn-small btn-primary"
                                onClick={() => handleSwitchToArchivedPlan(plan.id)}
                              >
                                Restore
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowArchivedPlans(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .subdivision-planner {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .page-header p {
          color: #6b7280;
          margin-bottom: 1rem;
        }

        /* T135: Mode toggle styles */
        .mode-toggle {
          display: flex;
          gap: 0.5rem;
          margin-top: 1.5rem;
        }

        .btn-mode {
          padding: 0.5rem 1.5rem;
          border: 2px solid #d1d5db;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-mode:hover {
          background: #f3f4f6;
        }

        .btn-mode.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        /* T135: Comparison intro styles */
        .comparison-intro {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
          padding: 3rem;
          text-align: center;
          margin-bottom: 2rem;
        }

        .comparison-intro h2 {
          font-size: 1.8rem;
          margin: 0 0 1rem 0;
        }

        .comparison-intro p {
          font-size: 1.1rem;
          opacity: 0.95;
          margin: 0 0 2rem 0;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .btn-large {
          padding: 1rem 2.5rem;
          font-size: 1.1rem;
        }

        .loading-message, .no-land-message {
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 3rem;
          text-align: center;
          margin-bottom: 2rem;
        }

        .loading-message {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .no-land-message p {
          margin: 0.5rem 0;
          color: #6b7280;
        }

        .no-land-message .btn-primary {
          margin-top: 1.5rem;
        }

        .subdivision-view-placeholder {
          background: #f9fafb;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          padding: 3rem;
          text-align: center;
          margin-bottom: 2rem;
        }

        .subdivision-view-placeholder p {
          margin: 0.5rem 0;
          color: #6b7280;
        }

        .lot-selector {
          margin-top: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }

        .lot-selector label {
          font-weight: 500;
        }

        .lot-selector input {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 1rem;
          width: 300px;
        }

        .image-manager-section {
          margin-top: 2rem;
          margin-bottom: 2rem;
        }

        .navigation-actions {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid #e5e7eb;
        }

        .btn-primary, .btn-secondary {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-with-badge {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .feature-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: rgba(255, 255, 255, 0.25);
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .btn-secondary {
          background: #6b7280;
          color: white;
        }

        .btn-secondary:hover {
          background: #4b5563;
        }

        /* T111: Archived plans link styles */
        .archived-plans-link {
          margin-top: 1rem;
        }

        .btn-link {
          background: none;
          border: none;
          color: #3b82f6;
          cursor: pointer;
          font-size: 0.95rem;
          padding: 0.5rem 0;
          text-decoration: underline;
        }

        .btn-link:hover {
          color: #2563eb;
        }

        /* T111: Modal styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 900px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
          padding: 0.25rem 0.5rem;
        }

        .modal-close:hover {
          color: #1f2937;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .text-muted {
          color: #6b7280;
          text-align: center;
          padding: 2rem;
        }

        /* T111: Archived plans table */
        .archived-plans-list {
          overflow-x: auto;
        }

        .archived-plans-table {
          width: 100%;
          border-collapse: collapse;
        }

        .archived-plans-table th {
          background: #f9fafb;
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.875rem;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
        }

        .archived-plans-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e5e7eb;
          font-size: 0.875rem;
        }

        .archived-plans-table tbody tr:hover {
          background: #f9fafb;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.valid {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.warnings {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.invalid {
          background: #fee2e2;
          color: #991b1b;
        }

        .btn-small {
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default SubdivisionPlanner;
