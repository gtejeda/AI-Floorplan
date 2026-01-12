import React, { useState, useEffect } from 'react';
import './Settings.css';

interface AppSettings {
  defaultCurrency: 'DOP' | 'USD';
  defaultUnit: 'sqm' | 'sqft';
  exchangeRate: number;
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'es';
}

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Application Settings Dialog
 * Manages user preferences and application configuration
 */
export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AppSettings>({
    defaultCurrency: 'USD',
    defaultUnit: 'sqm',
    exchangeRate: 58.5,
    theme: 'light',
    language: 'en'
  });

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [telemetryEnabled, setTelemetryEnabled] = useState(false);
  const [telemetryStats, setTelemetryStats] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadTelemetrySettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      if (window.electronAPI?.getSettings) {
        const savedSettings = await window.electronAPI.getSettings();
        setSettings(savedSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadTelemetrySettings = async () => {
    try {
      if (window.electronAPI?.telemetry) {
        const { enabled } = await window.electronAPI.telemetry.isEnabled();
        setTelemetryEnabled(enabled);

        const stats = await window.electronAPI.telemetry.getStatistics();
        setTelemetryStats(stats);
      }
    } catch (error) {
      console.error('Failed to load telemetry settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      if (window.electronAPI?.saveSettings) {
        await window.electronAPI.saveSettings(settings);
        onClose();
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const handleClearStorage = async () => {
    try {
      if (window.electronAPI?.clearLocalStorage) {
        await window.electronAPI.clearLocalStorage();
        setShowClearConfirm(false);
        alert('Local storage cleared successfully. The application will now reload.');
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to clear storage:', error);
      alert('Failed to clear storage. Please try again.');
    }
  };

  const handleTelemetryToggle = async () => {
    try {
      if (window.electronAPI?.telemetry) {
        if (telemetryEnabled) {
          await window.electronAPI.telemetry.disable();
          setTelemetryEnabled(false);
        } else {
          await window.electronAPI.telemetry.enable();
          setTelemetryEnabled(true);
        }
        await loadTelemetrySettings(); // Reload stats
      }
    } catch (error) {
      console.error('Failed to toggle telemetry:', error);
      alert('Failed to update telemetry settings. Please try again.');
    }
  };

  const handleClearTelemetryData = async () => {
    try {
      if (window.electronAPI?.telemetry) {
        await window.electronAPI.telemetry.clearData();
        await loadTelemetrySettings(); // Reload stats
        alert('Telemetry data cleared successfully.');
      }
    } catch (error) {
      console.error('Failed to clear telemetry data:', error);
      alert('Failed to clear telemetry data. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          {/* General Settings */}
          <section className="settings-section">
            <h3>General</h3>

            <div className="setting-item">
              <label htmlFor="defaultCurrency">Default Currency</label>
              <select
                id="defaultCurrency"
                value={settings.defaultCurrency}
                onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value as 'DOP' | 'USD' })}
              >
                <option value="USD">USD ($)</option>
                <option value="DOP">DOP (RD$)</option>
              </select>
              <span className="setting-hint">Currency used for new projects</span>
            </div>

            <div className="setting-item">
              <label htmlFor="defaultUnit">Default Unit</label>
              <select
                id="defaultUnit"
                value={settings.defaultUnit}
                onChange={(e) => setSettings({ ...settings, defaultUnit: e.target.value as 'sqm' | 'sqft' })}
              >
                <option value="sqm">Square Meters (m²)</option>
                <option value="sqft">Square Feet (ft²)</option>
              </select>
              <span className="setting-hint">Area measurement unit</span>
            </div>

            <div className="setting-item">
              <label htmlFor="exchangeRate">Exchange Rate (DOP per USD)</label>
              <input
                id="exchangeRate"
                type="number"
                step="0.01"
                min="0"
                value={settings.exchangeRate}
                onChange={(e) => setSettings({ ...settings, exchangeRate: parseFloat(e.target.value) })}
              />
              <span className="setting-hint">Used for currency conversions</span>
            </div>
          </section>

          {/* Appearance */}
          <section className="settings-section">
            <h3>Appearance</h3>

            <div className="setting-item">
              <label htmlFor="theme">Theme</label>
              <select
                id="theme"
                value={settings.theme}
                onChange={(e) => setSettings({ ...settings, theme: e.target.value as 'light' | 'dark' | 'auto' })}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>

            <div className="setting-item">
              <label htmlFor="language">Language</label>
              <select
                id="language"
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value as 'en' | 'es' })}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
              <span className="setting-hint">Application language (coming soon)</span>
            </div>
          </section>

          {/* Privacy & Telemetry */}
          <section className="settings-section">
            <h3>Privacy & Telemetry</h3>

            <div className="setting-item">
              <div className="setting-header-with-toggle">
                <label htmlFor="telemetryEnabled">
                  Crash Reporting & Usage Analytics
                </label>
                <label className="toggle-switch">
                  <input
                    id="telemetryEnabled"
                    type="checkbox"
                    checked={telemetryEnabled}
                    onChange={handleTelemetryToggle}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <span className="setting-hint">
                Help improve Micro Villas by anonymously sharing crash reports and usage data.
                No personal information is collected. You can disable this at any time.
              </span>
            </div>

            {telemetryEnabled && telemetryStats && (
              <div className="setting-item telemetry-stats">
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Events Collected:</span>
                    <span className="stat-value">{telemetryStats.eventCount}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Session ID:</span>
                    <span className="stat-value mono">{telemetryStats.sessionId?.substring(0, 8)}...</span>
                  </div>
                  {telemetryStats.enabledAt && (
                    <div className="stat-item">
                      <span className="stat-label">Enabled Since:</span>
                      <span className="stat-value">{new Date(telemetryStats.enabledAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <button
                  className="secondary-button"
                  onClick={handleClearTelemetryData}
                >
                  Clear Telemetry Data
                </button>
              </div>
            )}

            <div className="privacy-notice">
              <strong>What we collect:</strong>
              <ul>
                <li>Crash logs and error messages</li>
                <li>Performance metrics (calculation times, export/import durations)</li>
                <li>Feature usage (which tools you use)</li>
              </ul>
              <strong>What we DON'T collect:</strong>
              <ul>
                <li>Your name, email, or personal information</li>
                <li>Project data or financial information</li>
                <li>File paths or directory names</li>
              </ul>
            </div>
          </section>

          {/* Data Management */}
          <section className="settings-section">
            <h3>Data Management</h3>

            <div className="setting-item">
              <label>Clear Local Storage</label>
              {!showClearConfirm ? (
                <button
                  className="danger-button"
                  onClick={() => setShowClearConfirm(true)}
                >
                  Clear All Data
                </button>
              ) : (
                <div className="clear-confirm">
                  <p className="warning-text">
                    This will delete all projects, settings, and images. This action cannot be undone.
                  </p>
                  <div className="confirm-buttons">
                    <button
                      className="danger-button"
                      onClick={handleClearStorage}
                    >
                      Confirm Clear
                    </button>
                    <button
                      className="cancel-button"
                      onClick={() => setShowClearConfirm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <span className="setting-hint">Remove all locally stored data</span>
            </div>
          </section>
        </div>

        <div className="settings-footer">
          <button className="cancel-button" onClick={onClose}>Cancel</button>
          <button className="save-button" onClick={saveSettings}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
