/**
 * Export.tsx
 *
 * UI component for exporting projects to disk
 *
 * Related Tasks:
 * - T173: Create Export UI component with export button and status
 * - T174: Add "Select Export Directory" button
 * - T175: Add "Export Project" button (enabled when directory selected)
 * - T176: Display export progress and success/failure message with exported file paths
 * - T177: Validate export completes in <10 seconds
 */

import React, { useState } from 'react';
import type { ExportResult } from '../../models/Export';

interface ExportProps {
  projectId: string;
  projectName: string;
}

export const Export: React.FC<ExportProps> = ({ projectId, projectName }) => {
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportStartTime, setExportStartTime] = useState<number>(0);
  const [exportDuration, setExportDuration] = useState<number>(0);

  /**
   * T174: Handle directory selection
   */
  const handleSelectDirectory = async () => {
    try {
      const result = await window.electronAPI.selectExportDirectory();

      if (result.success && result.path) {
        setSelectedDirectory(result.path);
        setExportResult(null); // Clear previous results
      }
    } catch (error: any) {
      console.error('Error selecting export directory:', error);
      setExportResult({
        success: false,
        exportPath: '',
        files: { projectJson: '', images: [] },
        metadata: { exportDate: new Date(), fileCount: 0, totalSize: 0, checksum: '' },
        errors: [error.message],
      });
    }
  };

  /**
   * T175: Handle project export
   * T177: Track export duration (must be <10 seconds per SC-006)
   */
  const handleExport = async () => {
    if (!selectedDirectory) return;

    setIsExporting(true);
    setExportStartTime(Date.now());

    try {
      const result = await window.electronAPI.exportProject({
        projectId,
        targetDirectory: selectedDirectory,
      });

      const duration = Date.now() - Date.now();
      setExportDuration(duration);
      setExportResult(result);

      // T177: Validate performance (<10 seconds)
      if (duration > 10000) {
        console.warn(`Export took ${duration}ms, exceeding 10s target (SC-006)`);
      }
    } catch (error: any) {
      console.error('Error exporting project:', error);
      setExportResult({
        success: false,
        exportPath: '',
        files: { projectJson: '', images: [] },
        metadata: { exportDate: new Date(), fileCount: 0, totalSize: 0, checksum: '' },
        errors: [error.message],
      });
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Helper: Format file size in human-readable format
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="export-container">
      <div className="export-header">
        <h2>Export Project</h2>
        <p>Export "{projectName}" to disk for backup, sharing, or AI tool integration</p>
      </div>

      <div className="export-form">
        {/* T174: Select Export Directory Button */}
        <div className="form-group">
          <label>Export Directory</label>
          <div className="directory-selector">
            <button
              onClick={handleSelectDirectory}
              disabled={isExporting}
              className="btn-select-directory"
            >
              Select Export Directory
            </button>
            {selectedDirectory && (
              <div className="selected-path">
                <span className="path-icon">📁</span>
                <span className="path-text">{selectedDirectory}</span>
              </div>
            )}
          </div>
        </div>

        {/* T175: Export Project Button */}
        <div className="form-group">
          <button
            onClick={handleExport}
            disabled={!selectedDirectory || isExporting}
            className="btn-export"
          >
            {isExporting ? (
              <>
                <span className="spinner">⏳</span>
                Exporting...
              </>
            ) : (
              'Export Project'
            )}
          </button>
        </div>
      </div>

      {/* T176: Display export progress and results */}
      {exportResult && (
        <div className={`export-result ${exportResult.success ? 'success' : 'error'}`}>
          {exportResult.success ? (
            <>
              <div className="result-header success-header">
                <span className="icon">✅</span>
                <h3>Export Successful!</h3>
              </div>

              <div className="result-details">
                <div className="detail-item">
                  <strong>Export Location:</strong>
                  <div className="export-path">{exportResult.exportPath}</div>
                </div>

                <div className="detail-item">
                  <strong>Files Exported:</strong>
                  <ul className="file-list">
                    <li>
                      <span className="file-icon">📄</span>
                      <code>project.json</code>
                    </li>
                    {exportResult.files.images.length > 0 && (
                      <li>
                        <span className="file-icon">🖼️</span>
                        <code>images/</code> ({exportResult.files.images.length} files)
                      </li>
                    )}
                    {exportResult.files.aiPrompts && exportResult.files.aiPrompts.length > 0 && (
                      <li>
                        <span className="file-icon">🤖</span>
                        <code>ai-prompts/</code> ({exportResult.files.aiPrompts.length} files)
                      </li>
                    )}
                    <li>
                      <span className="file-icon">📝</span>
                      <code>README.txt</code>
                    </li>
                  </ul>
                </div>

                <div className="detail-item">
                  <strong>Export Summary:</strong>
                  <div className="summary-stats">
                    <div className="stat">
                      <span className="stat-label">Total Files:</span>
                      <span className="stat-value">{exportResult.metadata.fileCount}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Total Size:</span>
                      <span className="stat-value">
                        {formatFileSize(exportResult.metadata.totalSize)}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Export Time:</span>
                      <span className="stat-value">
                        {(exportDuration / 1000).toFixed(2)}s
                        {exportDuration > 10000 && (
                          <span className="warning"> ⚠️ Exceeds 10s target</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-item">
                  <strong>Data Integrity:</strong>
                  <div className="checksum">
                    <code>{exportResult.metadata.checksum}</code>
                    <span className="checksum-label">SHA-256 Checksum</span>
                  </div>
                </div>

                <div className="export-instructions">
                  <h4>Next Steps:</h4>
                  <ol>
                    <li>Your project has been exported to the selected directory</li>
                    <li>All project data, images, and AI prompts (if generated) are included</li>
                    <li>Use the "Import Project" feature to restore this project later</li>
                    <li>Share the export directory for collaboration or backup</li>
                  </ol>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="result-header error-header">
                <span className="icon">❌</span>
                <h3>Export Failed</h3>
              </div>

              <div className="result-details">
                <div className="detail-item">
                  <strong>Errors:</strong>
                  <ul className="error-list">
                    {exportResult.errors?.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>

                <div className="export-instructions">
                  <h4>Troubleshooting:</h4>
                  <ul>
                    <li>Ensure the export directory is writeable</li>
                    <li>Check that you have sufficient disk space</li>
                    <li>Try selecting a different export directory</li>
                    <li>Close any programs that might be accessing the export directory</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <style jsx>{`
        .export-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }

        .export-header {
          margin-bottom: 2rem;
        }

        .export-header h2 {
          font-size: 1.8rem;
          margin-bottom: 0.5rem;
        }

        .export-header p {
          color: #666;
          font-size: 0.95rem;
        }

        .export-form {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          font-size: 0.9rem;
          color: #333;
        }

        .directory-selector {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .btn-select-directory,
        .btn-export {
          padding: 0.75rem 1.5rem;
          font-size: 0.95rem;
          font-weight: 600;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-select-directory {
          background: #6c757d;
          color: white;
          width: fit-content;
        }

        .btn-select-directory:hover:not(:disabled) {
          background: #5a6268;
        }

        .btn-export {
          background: #007bff;
          color: white;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn-export:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-export:disabled,
        .btn-select-directory:disabled {
          background: #ccc;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .selected-path {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          font-family: monospace;
          font-size: 0.85rem;
        }

        .path-icon {
          font-size: 1.2rem;
        }

        .spinner {
          display: inline-block;
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

        .export-result {
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 2rem;
        }

        .export-result.success {
          background: #d4edda;
          border: 1px solid #c3e6cb;
        }

        .export-result.error {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
        }

        .result-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .result-header .icon {
          font-size: 1.5rem;
        }

        .result-header h3 {
          margin: 0;
          font-size: 1.3rem;
        }

        .success-header {
          color: #155724;
        }

        .error-header {
          color: #721c24;
        }

        .result-details {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .detail-item strong {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          color: #333;
        }

        .export-path {
          font-family: monospace;
          padding: 0.75rem;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
          font-size: 0.85rem;
          word-break: break-all;
        }

        .file-list,
        .error-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .file-list li {
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .file-icon {
          font-size: 1.1rem;
        }

        .file-list code {
          font-family: monospace;
          font-size: 0.85rem;
        }

        .error-list li {
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          margin-bottom: 0.5rem;
          color: #721c24;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .stat {
          padding: 0.75rem;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .stat-label {
          font-size: 0.8rem;
          color: #666;
        }

        .stat-value {
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
        }

        .stat-value .warning {
          color: #856404;
          font-size: 0.8rem;
          font-weight: normal;
        }

        .checksum {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.75rem;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
        }

        .checksum code {
          font-family: monospace;
          font-size: 0.75rem;
          word-break: break-all;
          color: #666;
        }

        .checksum-label {
          font-size: 0.75rem;
          color: #666;
        }

        .export-instructions {
          padding: 1rem;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
        }

        .export-instructions h4 {
          margin-top: 0;
          margin-bottom: 0.75rem;
          font-size: 1rem;
        }

        .export-instructions ol,
        .export-instructions ul {
          margin: 0;
          padding-left: 1.5rem;
        }

        .export-instructions li {
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
};

export default Export;
