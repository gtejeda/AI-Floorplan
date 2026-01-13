/**
 * LandConfig Component
 * Land parcel configuration UI with form inputs
 * Phase 3: User Story 1 - Land Investment Setup
 */

import React, { useState, useEffect } from 'react';
import { LandParcel, LandParcelInput } from '../../models/LandParcel';
import { DominicanRepublicProvince, ALL_PROVINCES } from '../../models/Province';
import { Landmark } from '../../models/Landmark';
import { Money } from '../../models/Money';
import './LandConfig.css';

interface LandConfigProps {
  projectId: string;
  initialData?: LandParcel;
  onSave?: (landParcel: LandParcel) => void;
}

export const LandConfig: React.FC<LandConfigProps> = ({ projectId, initialData, onSave }) => {
  // Form state
  const [width, setWidth] = useState<number>(initialData?.width || 0);
  const [length, setLength] = useState<number>(initialData?.length || 0);
  const [area, setArea] = useState<number>(initialData?.area || 0);
  const [displayUnit, setDisplayUnit] = useState<'sqm' | 'sqft'>(initialData?.displayUnit || 'sqm');
  const [province, setProvince] = useState<DominicanRepublicProvince>(
    initialData?.province || 'Santo Domingo'
  );
  const [isUrbanized, setIsUrbanized] = useState<boolean>(initialData?.isUrbanized || false);
  const [acquisitionAmount, setAcquisitionAmount] = useState<number>(
    initialData?.acquisitionCost.amount || 0
  );
  const [acquisitionCurrency, setAcquisitionCurrency] = useState<'DOP' | 'USD'>(
    initialData?.acquisitionCost.currency || 'USD'
  );
  const [landmarks, setLandmarks] = useState<Landmark[]>(initialData?.landmarks || []);
  const [targetVillas, setTargetVillas] = useState<number | undefined>(undefined);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Track if component has mounted and if we're loading from initialData
  const hasMountedRef = React.useRef(false);
  const isLoadingInitialDataRef = React.useRef(false);

  // Update form state when initialData changes (for loading existing land parcels)
  useEffect(() => {
    if (initialData) {
      console.log('[LandConfig] Loading initial data:', initialData);
      isLoadingInitialDataRef.current = true; // Set flag before updating state

      setWidth(initialData.width);
      setLength(initialData.length);
      setArea(initialData.area);
      setDisplayUnit(initialData.displayUnit);
      setProvince(initialData.province);
      setIsUrbanized(initialData.isUrbanized);
      setAcquisitionAmount(initialData.acquisitionCost.amount);
      setAcquisitionCurrency(initialData.acquisitionCost.currency);
      setLandmarks(initialData.landmarks);

      // Reset flag after state updates have been processed
      setTimeout(() => {
        isLoadingInitialDataRef.current = false;
      }, 100);
    }
  }, [initialData]);

  // Calculate area when dimensions change
  useEffect(() => {
    if (width > 0 && length > 0) {
      setArea(Number((width * length).toFixed(2)));
    }
  }, [width, length]);

  // Auto-save handler (debounced) - only for user changes, not initial data loads
  useEffect(() => {
    // Skip on first mount
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    // Skip if we're loading initial data
    if (isLoadingInitialDataRef.current) {
      return;
    }

    // Only auto-save if we have existing data
    if (initialData) {
      const timer = setTimeout(() => {
        handleSave();
      }, 1000); // 1 second debounce

      return () => clearTimeout(timer);
    }
  }, [width, length, province, isUrbanized, acquisitionAmount, acquisitionCurrency, landmarks]);

  const handleSave = async () => {
    try {
      setSaveStatus('saving');
      setIsSaving(true);
      setErrorMessage('');

      // Validation
      if (width <= 0 || length <= 0) {
        throw new Error('Width and length must be greater than 0');
      }

      if (acquisitionAmount < 0) {
        throw new Error('Acquisition cost must be non-negative');
      }

      const landParcelInput: LandParcelInput = {
        projectId,
        width,
        length,
        province,
        isUrbanized,
        acquisitionCost: {
          amount: acquisitionAmount,
          currency: acquisitionCurrency,
        },
        landmarks,
        displayUnit,
      };

      let result: LandParcel;

      if (initialData) {
        // Update existing land parcel
        result = await window.electronAPI.updateLandParcel(initialData.id, landParcelInput);
      } else {
        // Create new land parcel
        result = await window.electronAPI.saveLandParcel(landParcelInput);
      }

      setSaveStatus('saved');

      if (onSave) {
        onSave(result);
      }

      // Reset status after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error: any) {
      console.error('Error saving land parcel:', error);
      setErrorMessage(error.message || 'Failed to save land parcel');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLandmark = () => {
    setLandmarks([
      ...landmarks,
      { type: 'other', name: '', distance: undefined, description: undefined },
    ]);
  };

  const handleRemoveLandmark = (index: number) => {
    setLandmarks(landmarks.filter((_, i) => i !== index));
  };

  const handleUpdateLandmark = (index: number, field: keyof Landmark, value: any) => {
    const updated = [...landmarks];
    updated[index] = { ...updated[index], [field]: value };
    setLandmarks(updated);
  };

  return (
    <div className="land-config">
      <h2>Land Parcel Configuration</h2>

      {/* Auto-save indicator */}
      {saveStatus !== 'idle' && (
        <div className={`save-indicator ${saveStatus}`}>
          {saveStatus === 'saving' && '💾 Saving...'}
          {saveStatus === 'saved' && '✓ Saved'}
          {saveStatus === 'error' && `✗ Error: ${errorMessage}`}
        </div>
      )}

      <div className="form-section">
        <h3>Dimensions</h3>

        {/* Unit selector */}
        <div className="form-group">
          <label>Display Unit:</label>
          <select
            value={displayUnit}
            onChange={(e) => setDisplayUnit(e.target.value as 'sqm' | 'sqft')}
          >
            <option value="sqm">Square Meters (m²)</option>
            <option value="sqft">Square Feet (ft²)</option>
          </select>
        </div>

        {/* Dimensions inputs */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="width">Width ({displayUnit === 'sqm' ? 'm' : 'ft'}):</label>
            <input
              id="width"
              type="number"
              min="0"
              step="0.01"
              value={width}
              onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="length">Length ({displayUnit === 'sqm' ? 'm' : 'ft'}):</label>
            <input
              id="length"
              type="number"
              min="0"
              step="0.01"
              value={length}
              onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
              required
            />
          </div>
        </div>

        {/* Calculated area */}
        <div className="form-group">
          <label>Total Area:</label>
          <div className="calculated-value">
            {area.toLocaleString()} {displayUnit}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Location</h3>

        {/* Province dropdown */}
        <div className="form-group">
          <label htmlFor="province">Province:</label>
          <select
            id="province"
            value={province}
            onChange={(e) => setProvince(e.target.value as DominicanRepublicProvince)}
            required
          >
            {ALL_PROVINCES.map((prov) => (
              <option key={prov} value={prov}>
                {prov}
              </option>
            ))}
          </select>
        </div>

        {/* Urbanization status */}
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={isUrbanized}
              onChange={(e) => setIsUrbanized(e.target.checked)}
            />
            Land is urbanized (has infrastructure)
          </label>
        </div>

        {/* Landmarks */}
        <div className="landmarks-section">
          <h4>Nearby Landmarks</h4>
          {landmarks.map((landmark, index) => (
            <div key={index} className="landmark-item">
              <select
                value={landmark.type}
                onChange={(e) => handleUpdateLandmark(index, 'type', e.target.value)}
              >
                <option value="beach">Beach</option>
                <option value="airport">Airport</option>
                <option value="tourist_attraction">Tourist Attraction</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="other">Other</option>
              </select>

              <input
                type="text"
                placeholder="Name"
                value={landmark.name}
                onChange={(e) => handleUpdateLandmark(index, 'name', e.target.value)}
              />

              <input
                type="number"
                placeholder="Distance (km)"
                value={landmark.distance || ''}
                onChange={(e) =>
                  handleUpdateLandmark(index, 'distance', parseFloat(e.target.value) || undefined)
                }
              />

              <button type="button" onClick={() => handleRemoveLandmark(index)}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" onClick={handleAddLandmark}>
            + Add Landmark
          </button>
        </div>
      </div>

      <div className="form-section">
        <h3>Financial</h3>

        {/* Acquisition cost */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="acquisition-amount">Acquisition Cost:</label>
            <input
              id="acquisition-amount"
              type="number"
              min="0"
              step="0.01"
              value={acquisitionAmount}
              onChange={(e) => setAcquisitionAmount(parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="acquisition-currency">Currency:</label>
            <select
              id="acquisition-currency"
              value={acquisitionCurrency}
              onChange={(e) => setAcquisitionCurrency(e.target.value as 'DOP' | 'USD')}
            >
              <option value="USD">USD ($)</option>
              <option value="DOP">DOP (RD$)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Optional: Target Micro-Villas</h3>

        <div className="form-group">
          <label htmlFor="target-villas">Target Number of Micro-Villas (optional):</label>
          <input
            id="target-villas"
            type="number"
            min="1"
            step="1"
            value={targetVillas || ''}
            onChange={(e) => setTargetVillas(parseInt(e.target.value) || undefined)}
            placeholder="Leave empty for automatic calculation"
          />
          <small>This will highlight subdivision scenarios matching your target count</small>
        </div>
      </div>

      {/* Manual save button (for initial save) */}
      {!initialData && (
        <div className="form-actions">
          <button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Land Parcel'}
          </button>
        </div>
      )}

      {errorMessage && <div className="error-message">{errorMessage}</div>}
    </div>
  );
};

export default LandConfig;
