/**
 * SubdivisionPlanner Page (T072 + T160)
 * Page for viewing and selecting subdivision scenarios
 * Phase 4: User Story 2 - Automatic Subdivision Calculation
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageManager } from '../components/ImageManager/ImageManager';

interface SubdivisionPlannerProps {
  projectId?: string;
}

export const SubdivisionPlanner: React.FC<SubdivisionPlannerProps> = ({ projectId: propProjectId }) => {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState<string | null>(propProjectId || null);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);

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

  return (
    <div className="subdivision-planner">
      <div className="page-header">
        <h1>Subdivision Planning</h1>
        <p>View and select subdivision scenarios, manage lot images</p>
      </div>

      {/* Subdivision visualization would go here (SubdivisionView component) */}
      <div className="subdivision-view-placeholder">
        <p>Subdivision visualization will be implemented here</p>
        <p>For now, select a lot ID to manage its images:</p>

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

      {/* T160: Integrate ImageManager for lot images */}
      {projectId && selectedLotId && (
        <div className="image-manager-section">
          <ImageManager
            projectId={projectId}
            associationType="lot"
            lotId={selectedLotId}
          />
        </div>
      )}

      <div className="navigation-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate('/')}
        >
          ← Back to Project Setup
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={() => navigate('/social-club')}
        >
          Next: Social Club Design →
        </button>
      </div>

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

export default SubdivisionPlanner;
