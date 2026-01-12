/**
 * Import Component
 * UI for importing projects from disk with validation and recovery options
 * Per FR-085, FR-086, FR-087, FR-088, FR-089, FR-091, FR-092, FR-093, FR-094
 */

import React, { useState } from 'react';
import { ImportResult, ImportOptions, DEFAULT_IMPORT_OPTIONS } from '../../models/Import';
import './Import.css';

declare global {
  interface Window {
    electronAPI: {
      selectImportDirectory: () => Promise<{ success: boolean; path: string | null; message: string }>;
      importProject: (sourceDir: string, options?: ImportOptions) => Promise<ImportResult>;
    };
  }
}

export const Import: React.FC = () => {
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPartialRecoveryDialog, setShowPartialRecoveryDialog] = useState(false);
  const [importOptions, setImportOptions] = useState<ImportOptions>(DEFAULT_IMPORT_OPTIONS);

  /**
   * Handle directory selection
   * T194: "Select Import Directory" button
   */
  const handleSelectDirectory = async () => {
    try {
      const result = await window.electronAPI.selectImportDirectory();

      if (result.success && result.path) {
        setSelectedDirectory(result.path);
        setImportResult(null); // Clear previous results
      } else {
        console.log('Directory selection canceled');
      }
    } catch (error: any) {
      console.error('Error selecting directory:', error);
      alert(`Failed to select directory: ${error.message}`);
    }
  };

  /**
   * Handle project import
   * T195: "Import Project" button
   */
  const handleImportProject = async () => {
    if (!selectedDirectory) {
      alert('Please select a directory first');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await window.electronAPI.importProject(selectedDirectory, importOptions);
      setImportResult(result);

      // Check if partial recovery is needed
      if (!result.success && result.errors.some(e => e.severity === 'recoverable')) {
        setShowPartialRecoveryDialog(true);
      } else if (result.success) {
        // Show success message
        alert(`Project imported successfully!\nProject ID: ${result.importedProjectId}\nDuration: ${(result.duration / 1000).toFixed(2)}s`);
      }
    } catch (error: any) {
      console.error('Error importing project:', error);
      setImportResult({
        success: false,
        message: `Import failed: ${error.message}`,
        importedAt: new Date(),
        validation: {
          structureValid: false,
          checksumValid: false,
          schemaValid: false,
          imagesValid: false
        },
        errors: [{
          field: 'import',
          message: error.message,
          severity: 'critical'
        }],
        warnings: [],
        missingImages: [],
        missingAIPrompts: [],
        duration: 0
      });
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Handle partial recovery confirmation
   * T197: Partial recovery UI
   */
  const handlePartialRecoveryConfirm = async () => {
    setShowPartialRecoveryDialog(false);
    setImportOptions({ ...importOptions, enablePartialRecovery: true });

    // Retry import with partial recovery enabled
    await handleImportProject();
  };

  const handlePartialRecoveryCancel = () => {
    setShowPartialRecoveryDialog(false);
  };

  /**
   * Render validation status badge
   */
  const renderValidationBadge = (label: string, isValid: boolean) => {
    return (
      <span className={`validation-badge ${isValid ? 'valid' : 'invalid'}`}>
        {isValid ? '✓' : '✗'} {label}
      </span>
    );
  };

  /**
   * Render error list
   * T196: Display import validation results
   */
  const renderErrors = (errors: any[]) => {
    if (errors.length === 0) return null;

    return (
      <div className="import-errors">
        <h3>Errors ({errors.length})</h3>
        <ul>
          {errors.map((error, index) => (
            <li key={index} className={`error-item ${error.severity}`}>
              <strong>{error.field}:</strong> {error.message}
              {error.expectedType && (
                <div className="error-details">
                  Expected: {error.expectedType}
                  {error.receivedValue !== undefined && `, Received: ${JSON.stringify(error.receivedValue)}`}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  /**
   * Render warning list
   */
  const renderWarnings = (warnings: any[]) => {
    if (warnings.length === 0) return null;

    return (
      <div className="import-warnings">
        <h3>Warnings ({warnings.length})</h3>
        <ul>
          {warnings.map((warning, index) => (
            <li key={index} className="warning-item">
              <strong>{warning.field}:</strong> {warning.message}
              {warning.suggestion && (
                <div className="warning-suggestion">
                  Suggestion: {warning.suggestion}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  /**
   * Render missing images
   * T198: Display missing image placeholders
   */
  const renderMissingImages = (missingImages: string[]) => {
    if (missingImages.length === 0) return null;

    return (
      <div className="missing-images">
        <h3>Missing Images ({missingImages.length})</h3>
        <p className="missing-images-note">
          These images were referenced in the project but not found in the import directory.
          They will be marked as placeholders in the project.
        </p>
        <ul>
          {missingImages.map((filename, index) => (
            <li key={index} className="missing-image-item">
              📷 {filename}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  /**
   * Render missing AI prompts
   */
  const renderMissingAIPrompts = (missingPrompts: string[]) => {
    if (missingPrompts.length === 0) return null;

    return (
      <div className="missing-ai-prompts">
        <h3>Missing AI Prompts ({missingPrompts.length})</h3>
        <ul>
          {missingPrompts.map((filename, index) => (
            <li key={index} className="missing-prompt-item">
              🤖 {filename}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="import-container">
      <div className="import-header">
        <h1>Import Project</h1>
        <p className="import-description">
          Load a previously exported project from disk with full data validation and recovery options.
        </p>
      </div>

      {/* Import Options */}
      <div className="import-options">
        <h2>Import Options</h2>
        <div className="option-group">
          <label>
            <input
              type="checkbox"
              checked={importOptions.enablePartialRecovery}
              onChange={(e) => setImportOptions({ ...importOptions, enablePartialRecovery: e.target.checked })}
            />
            Enable partial recovery (load valid fields, skip corrupted ones)
          </label>
        </div>
        <div className="option-group">
          <label>
            <input
              type="checkbox"
              checked={importOptions.validateChecksum}
              onChange={(e) => setImportOptions({ ...importOptions, validateChecksum: e.target.checked })}
            />
            Validate checksum (verify data integrity)
          </label>
        </div>
        <div className="option-group">
          <label>
            <input
              type="checkbox"
              checked={importOptions.importImages}
              onChange={(e) => setImportOptions({ ...importOptions, importImages: e.target.checked })}
            />
            Import images
          </label>
        </div>
      </div>

      {/* Directory Selection - T194 */}
      <div className="import-actions">
        <button
          className="btn btn-secondary"
          onClick={handleSelectDirectory}
          disabled={isImporting}
        >
          📁 Select Import Directory
        </button>

        {selectedDirectory && (
          <div className="selected-directory">
            <strong>Selected:</strong> {selectedDirectory}
          </div>
        )}

        {/* Import Button - T195 */}
        <button
          className="btn btn-primary"
          onClick={handleImportProject}
          disabled={!selectedDirectory || isImporting}
        >
          {isImporting ? '⏳ Importing...' : '📥 Import Project'}
        </button>
      </div>

      {/* Import Progress */}
      {isImporting && (
        <div className="import-progress">
          <div className="progress-spinner"></div>
          <p>Importing project... Please wait.</p>
        </div>
      )}

      {/* Import Results - T196 */}
      {importResult && !isImporting && (
        <div className={`import-result ${importResult.success ? 'success' : 'failure'}`}>
          <div className="result-header">
            <h2>{importResult.success ? '✓ Import Successful' : '✗ Import Failed'}</h2>
            <p className="result-message">{importResult.message}</p>
          </div>

          {/* Validation Status */}
          <div className="validation-status">
            <h3>Validation Status</h3>
            <div className="validation-badges">
              {renderValidationBadge('Structure', importResult.validation.structureValid)}
              {renderValidationBadge('Checksum', importResult.validation.checksumValid)}
              {renderValidationBadge('Schema', importResult.validation.schemaValid)}
              {renderValidationBadge('Images', importResult.validation.imagesValid)}
            </div>
          </div>

          {/* Performance Metrics */}
          {importResult.duration && (
            <div className="performance-metrics">
              <p>
                <strong>Import Duration:</strong> {(importResult.duration / 1000).toFixed(2)} seconds
                {importResult.duration < 10000 ? ' ✓' : ' (Warning: >10s)'}
              </p>
              <p><strong>Imported At:</strong> {new Date(importResult.importedAt).toLocaleString()}</p>
              {importResult.importedProjectId && (
                <p><strong>Project ID:</strong> {importResult.importedProjectId}</p>
              )}
            </div>
          )}

          {/* Partial Recovery Info */}
          {importResult.partialRecovery && importResult.partialRecovery.enabled && (
            <div className="partial-recovery-info">
              <h3>⚠️ Partial Recovery Applied</h3>
              <p>Some fields were corrupted and have been skipped:</p>
              <ul>
                {importResult.partialRecovery.skippedFields.map((field, index) => (
                  <li key={index}>{field}</li>
                ))}
              </ul>
              <p className="recovery-note">
                You will need to reconfigure these sections after import.
              </p>
            </div>
          )}

          {/* Errors */}
          {renderErrors(importResult.errors)}

          {/* Warnings */}
          {renderWarnings(importResult.warnings)}

          {/* Missing Images - T198 */}
          {renderMissingImages(importResult.missingImages)}

          {/* Missing AI Prompts */}
          {renderMissingAIPrompts(importResult.missingAIPrompts)}
        </div>
      )}

      {/* Partial Recovery Dialog - T197 */}
      {showPartialRecoveryDialog && importResult && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h2>⚠️ Import Failed - Partial Recovery Available</h2>
            <p>
              The project data contains errors and cannot be fully imported.
              However, partial recovery is available.
            </p>

            <div className="modal-errors">
              <h3>Detected Errors:</h3>
              <ul>
                {importResult.errors
                  .filter(e => e.severity === 'recoverable')
                  .map((error, index) => (
                    <li key={index}>
                      <strong>{error.field}:</strong> {error.message}
                    </li>
                  ))}
              </ul>
            </div>

            <p className="modal-question">
              Do you want to proceed with partial recovery?
              Valid fields will be imported, and corrupted fields will be skipped.
            </p>

            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={handlePartialRecoveryConfirm}
              >
                Yes, Proceed with Partial Recovery
              </button>
              <button
                className="btn btn-secondary"
                onClick={handlePartialRecoveryCancel}
              >
                No, Cancel Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Import;
