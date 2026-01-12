/**
 * SocialClubDesigner Page
 * Main page for designing the social club with amenities, storage, and maintenance room
 */

import React, { useState, useEffect } from 'react';
import { AmenitiesCatalog } from '../components/AmenitiesCatalog/AmenitiesCatalog';
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
  scenarioId: initialScenarioId
}) => {
  const [projectId, setProjectId] = useState<string>(initialProjectId || '');
  const [scenarioId, setScenarioId] = useState<string>(initialScenarioId || '');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // If project and scenario IDs are provided, we're ready to design
    if (projectId && scenarioId) {
      setIsReady(true);
    } else {
      // Otherwise, try to load from the current project context
      // This would be handled by the App component in a real implementation
      loadCurrentProject();
    }
  }, [projectId, scenarioId]);

  /**
   * Load current project from application context
   */
  const loadCurrentProject = async () => {
    try {
      // In a real implementation, this would load from app state/context
      // For now, we'll just show a message to the user
      console.log('No project selected. Please select a subdivision scenario first.');
    } catch (error) {
      console.error('Failed to load current project:', error);
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

  if (!isReady) {
    return (
      <div className="social-club-designer">
        <div className="not-ready">
          <h2>Social Club Designer</h2>
          <div className="message">
            <p>Please complete the following steps before designing the social club:</p>
            <ol>
              <li>Create or load a project</li>
              <li>Configure land parcel dimensions and details</li>
              <li>Calculate and select a subdivision scenario</li>
            </ol>
            <p>Once a subdivision scenario is selected, you can design the social club amenities.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="social-club-designer">
      <div className="page-header">
        <h1>Social Club Designer</h1>
        <p className="subtitle">Configure amenities, storage, and maintenance room for your Micro Villa community</p>
      </div>

      <AmenitiesCatalog
        projectId={projectId}
        scenarioId={scenarioId}
        onSave={handleSave}
      />
    </div>
  );
};
