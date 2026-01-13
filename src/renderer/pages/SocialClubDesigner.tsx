/**
 * SocialClubDesigner Page
 * Main page for designing the social club with amenities, storage, and maintenance room
 * Status: Phase 5 - Planned (Not Yet Implemented)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AmenitiesCatalog } from '../components/AmenitiesCatalog/AmenitiesCatalog';
import { AISocialClubDesigner } from '../components/SocialClubDesigner/AISocialClubDesigner';
import { FeatureRoadmap } from '../components/common/FeatureRoadmap';
import './SocialClubDesigner.css';

interface SocialClubDesignerProps {
  projectId?: string;
  scenarioId?: string;
}

/**
 * SocialClubDesigner Page Component
 */
export const SocialClubDesigner: React.FC<SocialClubDesignerProps> = ({
  projectId: initialProjectId,
  scenarioId: initialScenarioId,
}) => {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState<string>(initialProjectId || '');
  const [scenarioId, setScenarioId] = useState<string>(initialScenarioId || '');
  const [socialClubArea, setSocialClubArea] = useState<number>(0);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrentProject();
  }, []);

  useEffect(() => {
    // Check if we have project, scenario, and social club area to determine readiness
    if (projectId && scenarioId && socialClubArea > 0) {
      setIsReady(true);
    } else {
      setIsReady(false);
    }
  }, [projectId, scenarioId, socialClubArea]);

  /**
   * Load current project from localStorage and database
   */
  const loadCurrentProject = async () => {
    try {
      setIsLoading(true);

      // Load project ID from localStorage if not provided
      let currentProjectId = initialProjectId;
      if (!currentProjectId) {
        const savedProjectId = localStorage.getItem('currentProjectId');
        if (savedProjectId) {
          currentProjectId = savedProjectId;
          setProjectId(savedProjectId);
        }
      }

      // If we have a project ID, try to load the project and get scenario
      if (currentProjectId) {
        // Load the project to get the selected scenario ID
        const project = await window.electronAPI.loadProject(currentProjectId);

        // Check for traditional subdivision scenario first
        if (project && project.selectedScenarioId) {
          setScenarioId(project.selectedScenarioId);
        } else {
          // No traditional scenario - check for approved AI subdivision plan
          console.log('[SocialClubDesigner] No traditional scenario, checking for AI plan...');
          try {
            if (!window.aiService || !window.aiService.getActivePlan) {
              console.warn('[SocialClubDesigner] AI Service not available');
              return;
            }

            // Try to get the active AI subdivision plan (approved plan)
            const response = await window.aiService.getActivePlan(currentProjectId);
            const aiPlan = response?.plan || response; // Handle both { plan } and direct plan formats

            console.log('[SocialClubDesigner] AI plan retrieved:', {
              found: !!aiPlan,
              approved: aiPlan?.approvedByUser,
              planId: aiPlan?.id,
            });

            if (aiPlan && aiPlan.approvedByUser) {
              // Use the AI plan ID as the scenario ID
              // This allows the social club designer to work with AI-generated plans
              setScenarioId(aiPlan.id);

              // Extract social club area from plan JSON
              try {
                const planData = JSON.parse(aiPlan.planJson);
                const socialClubAmenity = planData.amenityAreas?.find(
                  (area: any) => area.type === 'social-club'
                );

                if (socialClubAmenity) {
                  setSocialClubArea(socialClubAmenity.areaSqm);
                  console.log('[SocialClubDesigner] Social club area:', socialClubAmenity.areaSqm);
                } else {
                  console.warn('[SocialClubDesigner] No social club area found in plan');
                }
              } catch (parseError) {
                console.error('[SocialClubDesigner] Error parsing plan JSON:', parseError);
              }

              console.log(
                '[SocialClubDesigner] ✓ Using approved AI subdivision plan as scenario:',
                aiPlan.id
              );
            } else if (aiPlan) {
              console.log('[SocialClubDesigner] ⚠ AI plan exists but not approved yet');
            } else {
              console.log(
                '[SocialClubDesigner] ⚠ No approved scenario or AI plan found for this project'
              );
            }
          } catch (aiError) {
            console.error('[SocialClubDesigner] Error checking AI plan:', aiError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load project context:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle save completion
   */
  const handleSave = (data: any) => {
    console.log('Social club design saved:', data);
    // In a real implementation, this would update app state/context
    // and potentially navigate to the next step (financial analysis)
  };

  if (isLoading) {
    return (
      <div className="social-club-designer">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading project context...</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="social-club-designer">
        <div className="not-ready">
          <div className="icon-container">
            <span className="large-icon">🏗️</span>
          </div>
          <h2>Social Club Designer</h2>
          <div className="message">
            <p className="main-message">
              To design the social club, you need to have an{' '}
              <strong>approved subdivision plan</strong> first.
            </p>
            <div className="steps-container">
              <h3>Next Steps:</h3>
              <ol>
                <li>
                  <strong>Go to Subdivision Planning</strong> and generate an AI-powered subdivision
                  layout
                </li>
                <li>
                  <strong>Review and approve</strong> the generated plan
                </li>
                <li>
                  <strong>Return here</strong> to design your social club amenities
                </li>
              </ol>
            </div>
            <p className="help-text">
              💡 The social club will use the lot count and layout from your approved subdivision
              plan to calculate costs and allocations.
            </p>
          </div>

          <div className="actions">
            <button
              type="button"
              className="btn-primary btn-large"
              onClick={() => navigate('/subdivision')}
            >
              Go to Subdivision Planning
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/')}>
              Back to Project Setup
            </button>
          </div>

          <div className="roadmap-section">
            <h3>Feature Roadmap</h3>
            <FeatureRoadmap compact />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="social-club-designer">
      <AISocialClubDesigner
        projectId={projectId}
        scenarioId={scenarioId}
        socialClubArea={socialClubArea}
      />

      <div className="navigation-actions">
        <button type="button" className="btn-secondary" onClick={() => navigate('/subdivision')}>
          ← Back to Subdivision Planning
        </button>
        <button type="button" className="btn-primary" onClick={() => navigate('/financial')}>
          Next: Financial Analysis →
        </button>
      </div>

      <style>{`
        .social-club-designer {
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

        .page-header .subtitle {
          color: #6b7280;
          margin-bottom: 1rem;
        }

        .status-badge-container {
          margin-top: 1rem;
        }

        .status-badge {
          display: inline-block;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .status-badge.status-ready {
          background: #d1fae5;
          color: #065f46;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          gap: 1.5rem;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-state p {
          color: #6b7280;
          font-size: 1rem;
        }

        .not-ready {
          background: linear-gradient(to bottom, #f9fafb 0%, white 100%);
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 3rem;
          text-align: center;
          max-width: 800px;
          margin: 2rem auto;
        }

        .icon-container {
          margin-bottom: 1.5rem;
        }

        .large-icon {
          font-size: 4rem;
          display: inline-block;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .not-ready h2 {
          font-size: 2rem;
          margin-bottom: 1.5rem;
          color: #1f2937;
        }

        .not-ready .message {
          margin: 0 auto 2rem auto;
        }

        .main-message {
          color: #374151;
          font-size: 1.1rem;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .main-message strong {
          color: #1f2937;
          font-weight: 600;
        }

        .steps-container {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .steps-container h3 {
          font-size: 1rem;
          color: #1f2937;
          margin: 0 0 1rem 0;
          text-align: left;
        }

        .steps-container ol {
          text-align: left;
          color: #4b5563;
          line-height: 1.8;
          margin: 0;
          padding-left: 1.5rem;
        }

        .steps-container li {
          margin-bottom: 0.75rem;
        }

        .steps-container li strong {
          color: #1f2937;
        }

        .help-text {
          color: #6b7280;
          font-size: 0.95rem;
          line-height: 1.6;
          margin: 0;
          padding: 1rem;
          background: #fef3c7;
          border-radius: 6px;
          border-left: 4px solid #f59e0b;
        }

        .not-ready .actions {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 3rem;
        }

        .btn-large {
          padding: 1rem 2rem;
          font-size: 1.05rem;
        }

        .roadmap-section {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid #e5e7eb;
        }

        .roadmap-section h3 {
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
          color: #1f2937;
          text-align: center;
        }

        .navigation-actions {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid #e5e7eb;
        }

        .btn-primary,
        .btn-secondary {
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

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-primary:disabled {
          background: #d1d5db;
          color: #9ca3af;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #6b7280;
          color: white;
        }

        .btn-secondary:hover {
          background: #4b5563;
        }
      `}</style>
    </div>
  );
};
