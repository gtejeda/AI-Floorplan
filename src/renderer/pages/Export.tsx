/**
 * Export.tsx - Export Page
 *
 * Main page for exporting projects to disk
 *
 * Related Tasks:
 * - T178: Create Export page integrating Export component
 */

import React, { useEffect, useState } from 'react';
import { Export as ExportComponent } from '../components/Export/Export';

export const ExportPage: React.FC = () => {
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentProject();
  }, []);

  const loadCurrentProject = async () => {
    try {
      // For now, we'll assume there's a current project ID stored in localStorage
      // In a real app, this would come from a global state management solution
      const projectId = localStorage.getItem('currentProjectId');

      if (!projectId) {
        setLoading(false);
        return;
      }

      const project = await window.electronAPI.loadProject(projectId);
      setCurrentProject(project);
    } catch (error) {
      console.error('Error loading current project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="export-page loading">
        <div className="loading-spinner">⏳</div>
        <p>Loading project...</p>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="export-page no-project">
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h2>No Project Loaded</h2>
          <p>Please create or load a project before exporting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="export-page">
      <ExportComponent projectId={currentProject.id} projectName={currentProject.name} />

      <style jsx>{`
        .export-page {
          min-height: 100vh;
          background: #ffffff;
        }

        .export-page.loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }

        .loading-spinner {
          font-size: 3rem;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .export-page.no-project {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          max-width: 500px;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-state h2 {
          font-size: 1.8rem;
          margin-bottom: 0.5rem;
          color: #333;
        }

        .empty-state p {
          font-size: 1rem;
          color: #666;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
};

export default ExportPage;
