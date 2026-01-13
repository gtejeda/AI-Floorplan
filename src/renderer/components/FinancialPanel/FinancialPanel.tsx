/**
 * FinancialPanel Component
 * Financial analysis UI with cost inputs and pricing scenarios
 * Phase 6: User Story 4 - Financial Analysis & Pricing
 */

import React, { useState, useEffect } from 'react';
import {
  FinancialAnalysis,
  FinancialAnalysisInput,
  CostBreakdown,
  LegalCosts,
  OtherCost,
  PricingScenario,
  ExchangeRate,
} from '../../models/FinancialAnalysis';
import { Money } from '../../models/Money';
import { v4 as uuidv4 } from 'uuid';
import './FinancialPanel.css';

interface FinancialPanelProps {
  projectId: string;
  landAcquisitionCost: Money; // Read-only from land parcel
  amenitiesTotal: Money; // Calculated from selected amenities
  lotCount: number; // From selected subdivision scenario
  totalLotArea: number; // Sum of all lot areas in sqm
  parkingSpaces: number; // 2 spaces per villa
  maintenanceRoomSize: number; // In sqm
  storageLocation: 'social-club' | 'patio'; // Storage configuration
  initialData?: FinancialAnalysis;
  onSave?: (analysis: FinancialAnalysis) => void;
}

export const FinancialPanel: React.FC<FinancialPanelProps> = ({
  projectId,
  landAcquisitionCost,
  amenitiesTotal,
  lotCount,
  totalLotArea,
  parkingSpaces,
  maintenanceRoomSize,
  storageLocation,
  initialData,
  onSave,
}) => {
  // Currency state
  const [displayCurrency, setDisplayCurrency] = useState<'DOP' | 'USD'>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(58.5); // Default DOP/USD rate
  const [exchangeRateDate, setExchangeRateDate] = useState<Date>(new Date());

  // Cost inputs
  const [parkingAreaCost, setParkingAreaCost] = useState<number>(
    initialData?.costs.parkingArea.amount || 0
  );
  const [walkwaysCost, setWalkwaysCost] = useState<number>(initialData?.costs.walkways.amount || 0);
  const [landscapingCost, setLandscapingCost] = useState<number>(
    initialData?.costs.landscaping.amount || 0
  );
  const [maintenanceRoomCost, setMaintenanceRoomCost] = useState<number>(
    initialData?.costs.maintenanceRoom.amount || 0
  );
  const [storageCost, setStorageCost] = useState<number>(initialData?.costs.storage.amount || 0);

  // Legal costs
  const [notaryFees, setNotaryFees] = useState<number>(
    initialData?.costs.legal.notaryFees.amount || 0
  );
  const [permits, setPermits] = useState<number>(initialData?.costs.legal.permits.amount || 0);
  const [registrations, setRegistrations] = useState<number>(
    initialData?.costs.legal.registrations.amount || 0
  );

  // Other costs
  const [otherCosts, setOtherCosts] = useState<OtherCost[]>(initialData?.costs.other || []);

  // Profit margins
  const [profitMargins, setProfitMargins] = useState<number[]>([15, 20, 25, 30]);
  const [customMargin, setCustomMargin] = useState<string>('');

  // Maintenance
  const [monthlyMaintenanceCost, setMonthlyMaintenanceCost] = useState<number>(
    initialData?.monthlyMaintenanceCost?.amount || 0
  );

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Calculated values
  const [analysis, setAnalysis] = useState<FinancialAnalysis | null>(initialData || null);

  // Calculate total legal costs
  const totalLegalCosts = notaryFees + permits + registrations;

  // Calculate total other costs
  const totalOtherCosts = otherCosts.reduce((sum, cost) => sum + cost.amount.amount, 0);

  // Calculate total project cost
  const totalProjectCost =
    landAcquisitionCost.amount +
    amenitiesTotal.amount +
    parkingAreaCost +
    walkwaysCost +
    landscapingCost +
    maintenanceRoomCost +
    storageCost +
    totalLegalCosts +
    totalOtherCosts;

  // Calculate cost per sqm for shared areas (parking, walkways, landscaping, maintenance)
  const sharedAreasCost = parkingAreaCost + walkwaysCost + landscapingCost + maintenanceRoomCost;
  const sharedAreasCostPerSqm = totalLotArea > 0 ? sharedAreasCost / totalLotArea : 0;

  // Calculate base lot cost
  const baseLotCost = lotCount > 0 ? totalProjectCost / lotCount : 0;

  // Auto-save handler (debounced)
  useEffect(() => {
    if (initialData) {
      const timer = setTimeout(() => {
        handleSave();
      }, 1000); // 1 second debounce

      return () => clearTimeout(timer);
    }
  }, [
    parkingAreaCost,
    walkwaysCost,
    landscapingCost,
    maintenanceRoomCost,
    storageCost,
    notaryFees,
    permits,
    registrations,
    otherCosts,
    monthlyMaintenanceCost,
    displayCurrency,
    exchangeRate,
  ]);

  const handleSave = async () => {
    try {
      setSaveStatus('saving');
      setIsSaving(true);
      setErrorMessage('');

      const costs: CostBreakdown = {
        landAcquisition: landAcquisitionCost,
        amenities: amenitiesTotal,
        parkingArea: { amount: parkingAreaCost, currency: displayCurrency },
        walkways: { amount: walkwaysCost, currency: displayCurrency },
        landscaping: { amount: landscapingCost, currency: displayCurrency },
        maintenanceRoom: { amount: maintenanceRoomCost, currency: displayCurrency },
        storage: { amount: storageCost, currency: displayCurrency },
        legal: {
          notaryFees: { amount: notaryFees, currency: displayCurrency },
          permits: { amount: permits, currency: displayCurrency },
          registrations: { amount: registrations, currency: displayCurrency },
          total: { amount: totalLegalCosts, currency: displayCurrency },
        },
        other: otherCosts,
      };

      const exchangeRateData: ExchangeRate = {
        from: 'USD',
        to: 'DOP',
        rate: exchangeRate,
        effectiveDate: exchangeRateDate,
      };

      const input: FinancialAnalysisInput = {
        projectId,
        costs,
        profitMargins,
        monthlyMaintenanceCost:
          monthlyMaintenanceCost > 0
            ? { amount: monthlyMaintenanceCost, currency: displayCurrency }
            : undefined,
        exchangeRate: exchangeRateData,
      };

      const result = await window.electronAPI.saveFinancialAnalysis(input);
      setAnalysis(result);
      setSaveStatus('saved');

      if (onSave) {
        onSave(result);
      }

      // Clear saved status after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      setSaveStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save financial analysis');
      console.error('Error saving financial analysis:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOtherCost = () => {
    const newCost: OtherCost = {
      id: uuidv4(),
      label: '',
      amount: { amount: 0, currency: displayCurrency },
      description: '',
    };
    setOtherCosts([...otherCosts, newCost]);
  };

  const handleUpdateOtherCost = (
    id: string,
    field: 'label' | 'amount' | 'description',
    value: any
  ) => {
    setOtherCosts(
      otherCosts.map((cost) => {
        if (cost.id === id) {
          if (field === 'amount') {
            return { ...cost, amount: { amount: Number(value), currency: displayCurrency } };
          }
          return { ...cost, [field]: value };
        }
        return cost;
      })
    );
  };

  const handleRemoveOtherCost = (id: string) => {
    setOtherCosts(otherCosts.filter((cost) => cost.id !== id));
  };

  const handleAddProfitMargin = () => {
    if (customMargin && !isNaN(Number(customMargin))) {
      const margin = Number(customMargin);
      if (margin > 0 && !profitMargins.includes(margin)) {
        setProfitMargins([...profitMargins, margin].sort((a, b) => a - b));
        setCustomMargin('');
      }
    }
  };

  const handleRemoveProfitMargin = (margin: number) => {
    setProfitMargins(profitMargins.filter((m) => m !== margin));
  };

  const convertCurrency = (
    amount: number,
    fromCurrency: 'DOP' | 'USD',
    toCurrency: 'DOP' | 'USD'
  ): number => {
    if (fromCurrency === toCurrency) return amount;
    if (fromCurrency === 'USD' && toCurrency === 'DOP') return amount * exchangeRate;
    if (fromCurrency === 'DOP' && toCurrency === 'USD') return amount / exchangeRate;
    return amount;
  };

  const formatCurrency = (amount: number, currency: 'DOP' | 'USD'): string => {
    const displayAmount = convertCurrency(amount, currency, displayCurrency);
    const symbol = displayCurrency === 'USD' ? '$' : 'RD$';
    return `${symbol}${displayAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculateMonthlyMaintenancePerOwner = (): number => {
    if (lotCount === 0 || monthlyMaintenanceCost === 0) return 0;
    // Proportional to lot area (simplified - equal split for now)
    return monthlyMaintenanceCost / lotCount;
  };

  return (
    <div className="financial-panel">
      <div className="financial-panel__header">
        <h2>Financial Analysis</h2>
        <div className="financial-panel__currency-toggle">
          <label>Display Currency:</label>
          <select
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value as 'DOP' | 'USD')}
          >
            <option value="USD">USD ($)</option>
            <option value="DOP">DOP (RD$)</option>
          </select>
          {displayCurrency === 'DOP' && (
            <div className="financial-panel__exchange-rate">
              <label>Exchange Rate (DOP/USD):</label>
              <input
                type="number"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value))}
                step="0.01"
                min="0"
              />
            </div>
          )}
        </div>
        {saveStatus === 'saving' && <div className="save-indicator saving">Saving...</div>}
        {saveStatus === 'saved' && <div className="save-indicator saved">Saved ✓</div>}
        {saveStatus === 'error' && (
          <div className="save-indicator error">Error: {errorMessage}</div>
        )}
      </div>

      <div className="financial-panel__sections">
        {/* Land Acquisition Cost - Read-only */}
        <section className="financial-section">
          <h3>Land Acquisition</h3>
          <div className="cost-item readonly">
            <label>Land Acquisition Cost:</label>
            <input
              type="text"
              value={formatCurrency(landAcquisitionCost.amount, landAcquisitionCost.currency)}
              readOnly
              disabled
            />
          </div>
        </section>

        {/* Amenities Total - Read-only */}
        <section className="financial-section">
          <h3>Social Club Amenities</h3>
          <div className="cost-item readonly">
            <label>Total Amenities Cost:</label>
            <input
              type="text"
              value={formatCurrency(amenitiesTotal.amount, amenitiesTotal.currency)}
              readOnly
              disabled
            />
            <small>Calculated from selected amenities in Social Club Designer</small>
          </div>
        </section>

        {/* Parking Area */}
        <section className="financial-section">
          <h3>Parking Area</h3>
          <div className="cost-item">
            <label>Parking Area Cost:</label>
            <input
              type="number"
              value={parkingAreaCost}
              onChange={(e) => setParkingAreaCost(Number(e.target.value))}
              step="100"
              min="0"
            />
            <small>Construction and landscaping for {parkingSpaces} spaces (2 per villa)</small>
          </div>
        </section>

        {/* Walkways and Landscaping */}
        <section className="financial-section">
          <h3>Walkways & Landscaping</h3>
          <div className="cost-item">
            <label>Walkway Construction:</label>
            <input
              type="number"
              value={walkwaysCost}
              onChange={(e) => setWalkwaysCost(Number(e.target.value))}
              step="100"
              min="0"
            />
          </div>
          <div className="cost-item">
            <label>Landscaping Cost:</label>
            <input
              type="number"
              value={landscapingCost}
              onChange={(e) => setLandscapingCost(Number(e.target.value))}
              step="100"
              min="0"
            />
          </div>
        </section>

        {/* Maintenance Room */}
        <section className="financial-section">
          <h3>Maintenance Room</h3>
          <div className="cost-item">
            <label>Maintenance Room Cost:</label>
            <input
              type="number"
              value={maintenanceRoomCost}
              onChange={(e) => setMaintenanceRoomCost(Number(e.target.value))}
              step="100"
              min="0"
            />
            <small>Construction and equipment for {maintenanceRoomSize} sqm room</small>
          </div>
        </section>

        {/* Storage Units */}
        <section className="financial-section">
          <h3>Storage Units</h3>
          <div className="cost-item">
            <label>
              {storageLocation === 'social-club'
                ? 'Social Club Storage (shared):'
                : 'Patio Storage (per lot):'}
            </label>
            <input
              type="number"
              value={storageCost}
              onChange={(e) => setStorageCost(Number(e.target.value))}
              step="100"
              min="0"
            />
            {storageLocation === 'patio' && (
              <small>Cost will be allocated per lot ({lotCount} lots)</small>
            )}
          </div>
        </section>

        {/* Legal Costs */}
        <section className="financial-section">
          <h3>Legal Costs</h3>
          <div className="cost-item">
            <label>Notary Fees:</label>
            <input
              type="number"
              value={notaryFees}
              onChange={(e) => setNotaryFees(Number(e.target.value))}
              step="50"
              min="0"
            />
          </div>
          <div className="cost-item">
            <label>Permits:</label>
            <input
              type="number"
              value={permits}
              onChange={(e) => setPermits(Number(e.target.value))}
              step="50"
              min="0"
            />
          </div>
          <div className="cost-item">
            <label>Registrations:</label>
            <input
              type="number"
              value={registrations}
              onChange={(e) => setRegistrations(Number(e.target.value))}
              step="50"
              min="0"
            />
          </div>
          <div className="cost-item total">
            <label>Total Legal Costs:</label>
            <span className="total-value">{formatCurrency(totalLegalCosts, displayCurrency)}</span>
          </div>
        </section>

        {/* Other Costs */}
        <section className="financial-section">
          <h3>Other Costs</h3>
          {otherCosts.map((cost) => (
            <div key={cost.id} className="cost-item other-cost">
              <input
                type="text"
                placeholder="Label (e.g., Infrastructure, Utilities, Marketing)"
                value={cost.label}
                onChange={(e) => handleUpdateOtherCost(cost.id, 'label', e.target.value)}
                className="cost-label"
              />
              <input
                type="number"
                value={cost.amount.amount}
                onChange={(e) => handleUpdateOtherCost(cost.id, 'amount', e.target.value)}
                step="100"
                min="0"
                className="cost-amount"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={cost.description || ''}
                onChange={(e) => handleUpdateOtherCost(cost.id, 'description', e.target.value)}
                className="cost-description"
              />
              <button onClick={() => handleRemoveOtherCost(cost.id)} className="remove-button">
                Remove
              </button>
            </div>
          ))}
          <button onClick={handleAddOtherCost} className="add-button">
            Add Other Cost
          </button>
        </section>

        {/* Total Project Cost Summary */}
        <section className="financial-section summary">
          <h3>Total Project Cost</h3>
          <div className="cost-breakdown">
            <div className="breakdown-item">
              <span>Land Acquisition:</span>
              <span>
                {formatCurrency(landAcquisitionCost.amount, landAcquisitionCost.currency)}
              </span>
            </div>
            <div className="breakdown-item">
              <span>Amenities:</span>
              <span>{formatCurrency(amenitiesTotal.amount, amenitiesTotal.currency)}</span>
            </div>
            <div className="breakdown-item">
              <span>Parking Area:</span>
              <span>{formatCurrency(parkingAreaCost, displayCurrency)}</span>
            </div>
            <div className="breakdown-item">
              <span>Walkways:</span>
              <span>{formatCurrency(walkwaysCost, displayCurrency)}</span>
            </div>
            <div className="breakdown-item">
              <span>Landscaping:</span>
              <span>{formatCurrency(landscapingCost, displayCurrency)}</span>
            </div>
            <div className="breakdown-item">
              <span>Maintenance Room:</span>
              <span>{formatCurrency(maintenanceRoomCost, displayCurrency)}</span>
            </div>
            <div className="breakdown-item">
              <span>Storage:</span>
              <span>{formatCurrency(storageCost, displayCurrency)}</span>
            </div>
            <div className="breakdown-item">
              <span>Legal Costs:</span>
              <span>{formatCurrency(totalLegalCosts, displayCurrency)}</span>
            </div>
            <div className="breakdown-item">
              <span>Other Costs:</span>
              <span>{formatCurrency(totalOtherCosts, displayCurrency)}</span>
            </div>
            <div className="breakdown-item total-cost">
              <span>
                <strong>TOTAL PROJECT COST:</strong>
              </span>
              <span>
                <strong>{formatCurrency(totalProjectCost, displayCurrency)}</strong>
              </span>
            </div>
          </div>
        </section>

        {/* Cost Per Square Meter for Shared Areas */}
        <section className="financial-section">
          <h3>Cost Per Square Meter (Shared Areas)</h3>
          <div className="cost-item readonly">
            <label>Shared Areas Cost/sqm:</label>
            <input
              type="text"
              value={formatCurrency(sharedAreasCostPerSqm, displayCurrency)}
              readOnly
              disabled
            />
            <small>
              Parking, walkways, landscaping, and maintenance room divided by total lot area (
              {totalLotArea.toFixed(2)} sqm)
            </small>
          </div>
        </section>

        {/* Base Lot Cost */}
        <section className="financial-section">
          <h3>Base Lot Cost</h3>
          <div className="cost-item readonly">
            <label>Base Cost Per Lot:</label>
            <input
              type="text"
              value={formatCurrency(baseLotCost, displayCurrency)}
              readOnly
              disabled
            />
            <small>
              Total project cost divided by {lotCount} lots (includes proportional land, shared
              costs, and storage)
            </small>
          </div>
        </section>

        {/* Profit Margins */}
        <section className="financial-section">
          <h3>Profit Margins</h3>
          <div className="profit-margins">
            {profitMargins.map((margin) => (
              <div key={margin} className="margin-item">
                <span>{margin}%</span>
                <button onClick={() => handleRemoveProfitMargin(margin)} className="remove-button">
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="add-margin">
            <input
              type="number"
              placeholder="Custom margin %"
              value={customMargin}
              onChange={(e) => setCustomMargin(e.target.value)}
              step="1"
              min="1"
              max="100"
            />
            <button onClick={handleAddProfitMargin} className="add-button">
              Add Margin
            </button>
          </div>
        </section>

        {/* Pricing Scenarios */}
        <section className="financial-section">
          <h3>Pricing Scenarios</h3>
          <table className="pricing-table">
            <thead>
              <tr>
                <th>Profit Margin</th>
                <th>Lot Sale Price</th>
                <th>Total Revenue</th>
                <th>Expected Profit</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {profitMargins.map((margin) => {
                const lotSalePrice = baseLotCost * (1 + margin / 100);
                const totalRevenue = lotSalePrice * lotCount;
                const expectedProfit = totalRevenue - totalProjectCost;
                const roi = totalProjectCost > 0 ? (expectedProfit / totalProjectCost) * 100 : 0;

                return (
                  <tr key={margin}>
                    <td>{margin}%</td>
                    <td>{formatCurrency(lotSalePrice, displayCurrency)}</td>
                    <td>{formatCurrency(totalRevenue, displayCurrency)}</td>
                    <td>{formatCurrency(expectedProfit, displayCurrency)}</td>
                    <td>{roi.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Monthly Maintenance */}
        <section className="financial-section">
          <h3>Monthly Maintenance</h3>
          <div className="cost-item">
            <label>Total Monthly Maintenance Cost:</label>
            <input
              type="number"
              value={monthlyMaintenanceCost}
              onChange={(e) => setMonthlyMaintenanceCost(Number(e.target.value))}
              step="10"
              min="0"
            />
          </div>
          <div className="cost-item readonly">
            <label>Per Owner (Equal Split):</label>
            <input
              type="text"
              value={formatCurrency(calculateMonthlyMaintenancePerOwner(), displayCurrency)}
              readOnly
              disabled
            />
            <small>Total maintenance cost divided by {lotCount} owners</small>
          </div>
        </section>
      </div>
    </div>
  );
};
