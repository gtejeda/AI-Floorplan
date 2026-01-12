/**
 * AmenitiesCatalog Component
 * Displays and allows selection of amenities for social club design
 * Includes storage and maintenance room configuration
 */

import React, { useState, useEffect } from 'react';
import { Amenity, AmenityCategory, SelectedAmenity } from '../../models/Amenity';
import { StorageType } from '../../models/StorageUnit';
import { formatMoney, createMoney, multiplyMoney } from '../../models/Money';
import './AmenitiesCatalog.css';

interface AmenitiesCatalogProps {
  projectId: string;
  scenarioId: string;
  onSave: (data: any) => void;
}

/**
 * Category display names
 */
const CATEGORY_NAMES: Record<AmenityCategory, string> = {
  aquatic: 'Aquatic',
  dining: 'Dining',
  recreation: 'Recreation',
  furniture: 'Furniture',
  landscaping: 'Landscaping',
  utilities: 'Utilities',
  storage: 'Storage'
};

/**
 * AmenitiesCatalog Component
 */
export const AmenitiesCatalog: React.FC<AmenitiesCatalogProps> = ({
  projectId,
  scenarioId,
  onSave
}) => {
  // State
  const [catalog, setCatalog] = useState<Amenity[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<SelectedAmenity[]>([]);
  const [storageType, setStorageType] = useState<StorageType>('centralized');
  const [dedicatedStorageArea, setDedicatedStorageArea] = useState<number>(50);
  const [maintenanceRoomSize, setMaintenanceRoomSize] = useState<number>(20);
  const [maintenanceRoomLocation, setMaintenanceRoomLocation] = useState<'in-social-club' | 'separate'>('in-social-club');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load amenities catalog on mount
  useEffect(() => {
    loadAmenitiesCatalog();
  }, []);

  /**
   * Load amenities catalog from main process
   */
  const loadAmenitiesCatalog = async () => {
    try {
      setLoading(true);
      const amenities = await window.electronAPI.getAmenitiesCatalog();
      setCatalog(amenities);
    } catch (error) {
      console.error('Failed to load amenities catalog:', error);
      alert('Failed to load amenities catalog');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle amenity selection
   */
  const toggleAmenity = (amenity: Amenity) => {
    const existingIndex = selectedAmenities.findIndex(a => a.amenityId === amenity.id);

    if (existingIndex >= 0) {
      // Remove amenity
      setSelectedAmenities(prev => prev.filter(a => a.amenityId !== amenity.id));
    } else {
      // Add amenity with default quantity of 1
      const newAmenity: SelectedAmenity = {
        amenityId: amenity.id,
        category: amenity.category,
        name: amenity.name,
        quantity: 1,
        unitCost: amenity.defaultCost,
        totalCost: amenity.defaultCost,
        spaceRequirement: amenity.spaceRequirement
      };
      setSelectedAmenities(prev => [...prev, newAmenity]);
    }
  };

  /**
   * Update amenity quantity
   */
  const updateQuantity = (amenityId: string, quantity: number) => {
    setSelectedAmenities(prev => prev.map(amenity => {
      if (amenity.amenityId === amenityId) {
        const totalCost = multiplyMoney(amenity.unitCost, quantity);
        return {
          ...amenity,
          quantity,
          totalCost
        };
      }
      return amenity;
    }));
  };

  /**
   * Update amenity unit cost (custom override)
   */
  const updateUnitCost = (amenityId: string, amount: number) => {
    setSelectedAmenities(prev => prev.map(amenity => {
      if (amenity.amenityId === amenityId) {
        const unitCost = createMoney(amount, amenity.unitCost.currency);
        const totalCost = multiplyMoney(unitCost, amenity.quantity);
        return {
          ...amenity,
          unitCost,
          totalCost
        };
      }
      return amenity;
    }));
  };

  /**
   * Calculate total cost of selected amenities
   */
  const calculateTotalCost = (): number => {
    return selectedAmenities.reduce((sum, amenity) => sum + amenity.totalCost.amount, 0);
  };

  /**
   * Handle save button click
   */
  const handleSave = async () => {
    // Validation
    if (selectedAmenities.length === 0) {
      alert('Please select at least one amenity');
      return;
    }

    if (storageType === 'centralized' && dedicatedStorageArea <= 0) {
      alert('Please specify dedicated storage area for centralized storage');
      return;
    }

    if (maintenanceRoomSize <= 0) {
      alert('Please specify maintenance room size');
      return;
    }

    try {
      setSaving(true);

      const data = {
        projectId,
        scenarioId,
        selectedAmenities,
        storageType,
        dedicatedStorageArea: storageType === 'centralized' ? dedicatedStorageArea : undefined,
        maintenanceRoomSize,
        maintenanceRoomLocation
      };

      await window.electronAPI.saveSocialClubDesign(data);

      // Call parent callback
      if (onSave) {
        onSave(data);
      }

      alert('Social club design saved successfully');
    } catch (error) {
      console.error('Failed to save social club design:', error);
      alert('Failed to save social club design');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Group amenities by category
   */
  const amenitiesByCategory = catalog.reduce((acc, amenity) => {
    if (!acc[amenity.category]) {
      acc[amenity.category] = [];
    }
    acc[amenity.category].push(amenity);
    return acc;
  }, {} as Record<AmenityCategory, Amenity[]>);

  /**
   * Check if amenity is selected
   */
  const isAmenitySelected = (amenityId: string): boolean => {
    return selectedAmenities.some(a => a.amenityId === amenityId);
  };

  /**
   * Get selected amenity details
   */
  const getSelectedAmenity = (amenityId: string): SelectedAmenity | undefined => {
    return selectedAmenities.find(a => a.amenityId === amenityId);
  };

  if (loading) {
    return <div className="amenities-catalog loading">Loading amenities...</div>;
  }

  return (
    <div className="amenities-catalog">
      <h2>Social Club Amenities Design</h2>

      {/* Amenities Selection */}
      <div className="amenities-section">
        <h3>Select Amenities</h3>

        {Object.entries(amenitiesByCategory).map(([category, amenities]) => (
          <div key={category} className="amenity-category">
            <h4>{CATEGORY_NAMES[category as AmenityCategory]}</h4>

            <div className="amenity-list">
              {amenities.map(amenity => {
                const selected = isAmenitySelected(amenity.id);
                const selectedDetails = getSelectedAmenity(amenity.id);

                return (
                  <div key={amenity.id} className={`amenity-item ${selected ? 'selected' : ''}`}>
                    <div className="amenity-checkbox">
                      <input
                        type="checkbox"
                        id={`amenity-${amenity.id}`}
                        checked={selected}
                        onChange={() => toggleAmenity(amenity)}
                      />
                      <label htmlFor={`amenity-${amenity.id}`}>
                        <strong>{amenity.name}</strong>
                        {amenity.isPopular && <span className="badge popular">Popular</span>}
                      </label>
                    </div>

                    <div className="amenity-details">
                      <p className="description">{amenity.description}</p>
                      {amenity.spaceRequirement && (
                        <p className="space">Space: {amenity.spaceRequirement} sqm</p>
                      )}
                    </div>

                    {selected && selectedDetails && (
                      <div className="amenity-config">
                        <div className="form-group">
                          <label>Quantity:</label>
                          <input
                            type="number"
                            min="1"
                            value={selectedDetails.quantity}
                            onChange={(e) => updateQuantity(amenity.id, parseInt(e.target.value) || 1)}
                          />
                        </div>

                        <div className="form-group">
                          <label>Unit Cost:</label>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={selectedDetails.unitCost.amount}
                            onChange={(e) => updateUnitCost(amenity.id, parseFloat(e.target.value) || 0)}
                          />
                          <span className="currency">{selectedDetails.unitCost.currency}</span>
                        </div>

                        <div className="form-group">
                          <label>Total Cost:</label>
                          <span className="total-cost">{formatMoney(selectedDetails.totalCost)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Storage Configuration */}
      <div className="storage-section">
        <h3>Storage Configuration</h3>

        <div className="storage-options">
          <div className="radio-group">
            <input
              type="radio"
              id="storage-centralized"
              name="storage-type"
              value="centralized"
              checked={storageType === 'centralized'}
              onChange={(e) => setStorageType(e.target.value as StorageType)}
            />
            <label htmlFor="storage-centralized">
              <strong>Social Club Storage (Centralized)</strong>
              <p>Storage units located in the social club area (shared)</p>
            </label>
          </div>

          <div className="radio-group">
            <input
              type="radio"
              id="storage-individual"
              name="storage-type"
              value="individual-patios"
              checked={storageType === 'individual-patios'}
              onChange={(e) => setStorageType(e.target.value as StorageType)}
            />
            <label htmlFor="storage-individual">
              <strong>Individual Patio Storage</strong>
              <p>Storage units on each individual lot's patio</p>
            </label>
          </div>
        </div>

        {storageType === 'centralized' && (
          <div className="form-group">
            <label>Dedicated Storage Area (sqm):</label>
            <input
              type="number"
              min="0"
              step="1"
              value={dedicatedStorageArea}
              onChange={(e) => setDedicatedStorageArea(parseFloat(e.target.value) || 0)}
              required
            />
          </div>
        )}
      </div>

      {/* Maintenance Room Configuration */}
      <div className="maintenance-section">
        <h3>Maintenance Room Configuration</h3>

        <div className="form-group">
          <label>Maintenance Room Size (sqm):</label>
          <input
            type="number"
            min="1"
            step="1"
            value={maintenanceRoomSize}
            onChange={(e) => setMaintenanceRoomSize(parseFloat(e.target.value) || 0)}
            required
          />
        </div>

        <div className="maintenance-location">
          <div className="radio-group">
            <input
              type="radio"
              id="maintenance-social-club"
              name="maintenance-location"
              value="in-social-club"
              checked={maintenanceRoomLocation === 'in-social-club'}
              onChange={(e) => setMaintenanceRoomLocation(e.target.value as 'in-social-club' | 'separate')}
            />
            <label htmlFor="maintenance-social-club">
              <strong>In Social Club</strong>
              <p>Maintenance room located within the social club building</p>
            </label>
          </div>

          <div className="radio-group">
            <input
              type="radio"
              id="maintenance-separate"
              name="maintenance-location"
              value="separate"
              checked={maintenanceRoomLocation === 'separate'}
              onChange={(e) => setMaintenanceRoomLocation(e.target.value as 'in-social-club' | 'separate')}
            />
            <label htmlFor="maintenance-separate">
              <strong>Separate Area</strong>
              <p>Maintenance room in a separate dedicated building</p>
            </label>
          </div>
        </div>
      </div>

      {/* Parking Information (Read-only) */}
      <div className="parking-section">
        <h3>Parking Configuration</h3>
        <div className="parking-info">
          <p><strong>Type:</strong> Centralized Parking</p>
          <p><strong>Configuration:</strong> 2 spaces per villa (auto-calculated from lot count)</p>
          <p className="note">Parking configuration is automatically calculated based on the selected subdivision scenario.</p>
        </div>
      </div>

      {/* Summary */}
      <div className="summary-section">
        <h3>Summary</h3>
        <div className="summary-details">
          <p><strong>Selected Amenities:</strong> {selectedAmenities.length}</p>
          <p><strong>Total Cost:</strong> ${calculateTotalCost().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p><strong>Storage Type:</strong> {storageType === 'centralized' ? 'Centralized' : 'Individual Patios'}</p>
          {storageType === 'centralized' && (
            <p><strong>Storage Area:</strong> {dedicatedStorageArea} sqm</p>
          )}
          <p><strong>Maintenance Room:</strong> {maintenanceRoomSize} sqm ({maintenanceRoomLocation === 'in-social-club' ? 'In Social Club' : 'Separate Area'})</p>
        </div>
      </div>

      {/* Actions */}
      <div className="actions">
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving || selectedAmenities.length === 0}
        >
          {saving ? 'Saving...' : 'Save Social Club Design'}
        </button>
      </div>
    </div>
  );
};
