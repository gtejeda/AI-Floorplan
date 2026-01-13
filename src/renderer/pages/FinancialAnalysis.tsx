/**
 * FinancialAnalysis Page
 * Integrates FinancialPanel component with project data
 * Phase 6: User Story 4 - Financial Analysis & Pricing
 */

import React, { useState, useEffect } from 'react';
import { FinancialPanel } from '../components/FinancialPanel/FinancialPanel';
import { FinancialAnalysis as FinancialAnalysisType } from '../models/FinancialAnalysis';
import { Money } from '../models/Money';
import './FinancialAnalysis.css';

interface FinancialAnalysisPageProps {
  projectId: string;
}

export const FinancialAnalysisPage: React.FC<FinancialAnalysisPageProps> = ({ projectId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [financialData, setFinancialData] = useState<FinancialAnalysisType | null>(null);

  // Project data needed for FinancialPanel
  const [landAcquisitionCost, setLandAcquisitionCost] = useState<Money>({
    amount: 0,
    currency: 'USD',
  });
  const [amenitiesTotal, setAmenitiesTotal] = useState<Money>({ amount: 0, currency: 'USD' });
  const [lotCount, setLotCount] = useState<number>(0);
  const [totalLotArea, setTotalLotArea] = useState<number>(0);
  const [parkingSpaces, setParkingSpaces] = useState<number>(0);
  const [maintenanceRoomSize, setMaintenanceRoomSize] = useState<number>(0);
  const [storageLocation, setStorageLocation] = useState<'social-club' | 'patio'>('social-club');

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Load project and related data
      const project = await window.electronAPI.loadProject(projectId);

      if (!project) {
        throw new Error('Project not found');
      }

      // Load land parcel data
      if (project.landParcelId) {
        const landParcel = await window.electronAPI.loadLandParcel(project.landParcelId);
        if (landParcel) {
          setLandAcquisitionCost(landParcel.acquisitionCost);
        }
      }

      // Load selected subdivision scenario
      if (project.selectedScenarioId) {
        const scenario = await window.electronAPI.loadSubdivisionScenario(
          project.selectedScenarioId
        );
        if (scenario) {
          setLotCount(scenario.lots.length);

          // Calculate total lot area
          const totalArea = scenario.lots.reduce((sum, lot) => sum + lot.area, 0);
          setTotalLotArea(totalArea);

          // Calculate parking spaces (2 per villa)
          setParkingSpaces(scenario.lots.length * 2);
        }
      }

      // Load social club design
      if (project.socialClubDesignId) {
        const socialClubDesign = await window.electronAPI.loadSocialClubDesign(
          project.socialClubDesignId
        );
        if (socialClubDesign) {
          // Calculate total amenities cost
          const totalAmenitiesCost = socialClubDesign.selectedAmenities.reduce(
            (sum, amenity) => sum + amenity.cost.amount,
            0
          );
          setAmenitiesTotal({ amount: totalAmenitiesCost, currency: 'USD' });

          // Get storage location
          setStorageLocation(socialClubDesign.storageLocation);

          // Get maintenance room size
          setMaintenanceRoomSize(socialClubDesign.maintenanceRoom.size);
        }
      }

      // Load existing financial analysis if available
      const existingAnalysis = await window.electronAPI.loadFinancialAnalysis(projectId);
      if (existingAnalysis) {
        setFinancialData(existingAnalysis);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project data');
      console.error('Error loading project data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFinancialAnalysis = async (analysis: FinancialAnalysisType) => {
    try {
      setFinancialData(analysis);
      console.log('Financial analysis saved:', analysis);
    } catch (err) {
      console.error('Error saving financial analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to save financial analysis');
    }
  };

  if (isLoading) {
    return (
      <div className="financial-analysis-page loading">
        <div className="spinner"></div>
        <p>Loading financial data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="financial-analysis-page error">
        <div className="error-message">
          <h2>Error Loading Financial Analysis</h2>
          <p>{error}</p>
          <button onClick={loadProjectData}>Retry</button>
        </div>
      </div>
    );
  }

  if (lotCount === 0) {
    return (
      <div className="financial-analysis-page no-data">
        <div className="no-data-message">
          <h2>No Subdivision Selected</h2>
          <p>Please select a subdivision scenario before performing financial analysis.</p>
          <p>Go to the Subdivision Planner to select a scenario.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="financial-analysis-page">
      <div className="page-header">
        <h1>Financial Analysis & Pricing</h1>
        <p className="page-description">
          Configure project costs, view cost breakdowns, and generate pricing scenarios with
          multiple profit margins.
        </p>
      </div>

      <div className="project-summary">
        <div className="summary-item">
          <span className="summary-label">Land Acquisition:</span>
          <span className="summary-value">
            {landAcquisitionCost.currency === 'USD' ? '$' : 'RD$'}
            {landAcquisitionCost.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Amenities Total:</span>
          <span className="summary-value">
            {amenitiesTotal.currency === 'USD' ? '$' : 'RD$'}
            {amenitiesTotal.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Number of Lots:</span>
          <span className="summary-value">{lotCount}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Lot Area:</span>
          <span className="summary-value">{totalLotArea.toFixed(2)} sqm</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Parking Spaces:</span>
          <span className="summary-value">{parkingSpaces} (2 per villa)</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Maintenance Room:</span>
          <span className="summary-value">{maintenanceRoomSize} sqm</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Storage Location:</span>
          <span className="summary-value">
            {storageLocation === 'social-club' ? 'Social Club (Shared)' : 'Individual Patios'}
          </span>
        </div>
      </div>

      <FinancialPanel
        projectId={projectId}
        landAcquisitionCost={landAcquisitionCost}
        amenitiesTotal={amenitiesTotal}
        lotCount={lotCount}
        totalLotArea={totalLotArea}
        parkingSpaces={parkingSpaces}
        maintenanceRoomSize={maintenanceRoomSize}
        storageLocation={storageLocation}
        initialData={financialData || undefined}
        onSave={handleSaveFinancialAnalysis}
      />
    </div>
  );
};
