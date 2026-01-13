/**
 * AIIntegration Component
 *
 * Provides manual triggers for AI-related features:
 * - Generate Claude Code subdivision optimization prompts
 * - Generate Google Nano Banana Pro image generation prompts
 * - Import optimized subdivision results from Claude Code
 */

import React, { useState } from 'react';
import type { Project } from '../../models/Project';

interface AIIntegrationProps {
  project: Project;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export const AIIntegration: React.FC<AIIntegrationProps> = ({ project, onSuccess, onError }) => {
  const [isGeneratingSubdivision, setIsGeneratingSubdivision] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastSubdivisionPromptPath, setLastSubdivisionPromptPath] = useState<string | null>(null);
  const [lastImagePromptsPath, setLastImagePromptsPath] = useState<string | null>(null);
  const [targetDirectory, setTargetDirectory] = useState<string>(project.targetDirectory || '');

  // Check if project is fully configured for AI subdivision prompt
  const canGenerateSubdivisionPrompt = !!(
    project.landParcel &&
    project.subdivisionScenarios &&
    project.subdivisionScenarios.length > 0
  );

  // Check if project has a selected scenario for image prompts
  const canGenerateImagePrompts = !!(project.landParcel && project.selectedScenarioId);

  /**
   * Handle Generate AI Subdivision Description
   */
  const handleGenerateSubdivisionPrompt = async () => {
    if (!canGenerateSubdivisionPrompt) {
      onError?.('Project must have land parcel and at least one subdivision scenario');
      return;
    }

    if (!targetDirectory) {
      onError?.('Please select a target directory first');
      return;
    }

    setIsGeneratingSubdivision(true);

    try {
      const result = await window.electronAPI.generateSubdivisionPrompt(
        project.id,
        targetDirectory
      );

      if (result.success) {
        setLastSubdivisionPromptPath(result.filePath);
        onSuccess?.(
          `AI subdivision prompt generated successfully!\n\nFile saved to: ${result.filePath}\n\nYou can now use this file with Claude Code for subdivision optimization.`
        );
      }
    } catch (error: any) {
      console.error('Error generating subdivision prompt:', error);
      onError?.(error.message || 'Failed to generate AI subdivision prompt');
    } finally {
      setIsGeneratingSubdivision(false);
    }
  };

  /**
   * Handle Generate AI Image Prompts
   */
  const handleGenerateImagePrompts = async () => {
    if (!canGenerateImagePrompts) {
      onError?.('Project must have a selected subdivision scenario');
      return;
    }

    if (!targetDirectory) {
      onError?.('Please select a target directory first');
      return;
    }

    setIsGeneratingImages(true);

    try {
      const result = await window.electronAPI.generateImagePrompts(project.id, targetDirectory);

      if (result.success) {
        setLastImagePromptsPath(result.filePath);
        onSuccess?.(
          `AI image prompts generated successfully!\n\nFile saved to: ${result.filePath}\n\nYou can now use these prompts with Google Nano Banana Pro for image generation.`
        );
      }
    } catch (error: any) {
      console.error('Error generating image prompts:', error);
      onError?.(error.message || 'Failed to generate AI image prompts');
    } finally {
      setIsGeneratingImages(false);
    }
  };

  /**
   * Handle Import Optimized Subdivision from Claude Code
   */
  const handleImportOptimizedSubdivision = async () => {
    setIsImporting(true);

    try {
      // Open file picker for JSON file
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) {
          setIsImporting(false);
          return;
        }

        try {
          const filePath = (file as any).path; // Electron provides file path

          const result = await window.electronAPI.importOptimizedSubdivision(filePath);

          if (result.success) {
            onSuccess?.(
              `Optimized subdivision imported successfully!\n\nNew scenario ID: ${result.scenarioId}\n\nThe project has been updated with the optimized layout from Claude Code.`
            );

            // Reload the page to show updated subdivision
            window.location.reload();
          }
        } catch (error: any) {
          console.error('Error importing optimized subdivision:', error);
          onError?.(error.message || 'Failed to import optimized subdivision');
        } finally {
          setIsImporting(false);
        }
      };
      input.click();
    } catch (error: any) {
      console.error('Error opening file picker:', error);
      onError?.(error.message || 'Failed to open file picker');
      setIsImporting(false);
    }
  };

  /**
   * Handle target directory selection
   */
  const handleSelectTargetDirectory = async () => {
    try {
      const directory = await window.electronAPI.selectExportDirectory();
      if (directory) {
        setTargetDirectory(directory);
      }
    } catch (error: any) {
      console.error('Error selecting directory:', error);
      onError?.(error.message || 'Failed to select directory');
    }
  };

  return (
    <div
      className="ai-integration-container"
      style={{
        padding: '24px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6',
      }}
    >
      <h2 style={{ marginBottom: '16px', fontSize: '24px', fontWeight: '600' }}>AI Integration</h2>

      <p style={{ marginBottom: '24px', color: '#6c757d' }}>
        Generate AI-ready prompts and import optimization results. All AI operations are triggered
        manually - nothing happens automatically.
      </p>

      {/* Target Directory Selection */}
      <div
        style={{
          marginBottom: '32px',
          padding: '16px',
          backgroundColor: '#fff',
          borderRadius: '6px',
        }}
      >
        <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '500' }}>
          Target Directory
        </h3>
        <p style={{ marginBottom: '12px', fontSize: '14px', color: '#6c757d' }}>
          Select a directory where AI prompts will be saved. This directory will be used for all
          AI-related file operations.
        </p>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleSelectTargetDirectory}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Select Directory
          </button>

          {targetDirectory && (
            <span style={{ fontSize: '14px', color: '#28a745', fontWeight: '500' }}>
              ✓ {targetDirectory}
            </span>
          )}
        </div>
      </div>

      {/* Claude Code Subdivision Optimization */}
      <div
        style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#fff',
          borderRadius: '6px',
        }}
      >
        <h3 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: '500' }}>
          1. Generate AI Subdivision Description (Claude Code)
        </h3>
        <p style={{ marginBottom: '12px', fontSize: '14px', color: '#6c757d' }}>
          Create a JSON file with your project constraints for Claude Code to optimize the
          subdivision layout.
        </p>

        {!canGenerateSubdivisionPrompt && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              marginBottom: '12px',
              fontSize: '14px',
              color: '#856404',
            }}
          >
            ⚠️ Project must have land parcel and at least one subdivision scenario
          </div>
        )}

        <button
          onClick={handleGenerateSubdivisionPrompt}
          disabled={!canGenerateSubdivisionPrompt || !targetDirectory || isGeneratingSubdivision}
          style={{
            padding: '10px 20px',
            backgroundColor:
              canGenerateSubdivisionPrompt && targetDirectory && !isGeneratingSubdivision
                ? '#28a745'
                : '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor:
              canGenerateSubdivisionPrompt && targetDirectory && !isGeneratingSubdivision
                ? 'pointer'
                : 'not-allowed',
            fontSize: '14px',
            fontWeight: '500',
            opacity:
              !canGenerateSubdivisionPrompt || !targetDirectory || isGeneratingSubdivision
                ? 0.6
                : 1,
          }}
        >
          {isGeneratingSubdivision ? 'Generating...' : 'Generate AI Subdivision Description'}
        </button>

        {lastSubdivisionPromptPath && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#155724',
            }}
          >
            ✓ Last generated: {lastSubdivisionPromptPath}
          </div>
        )}
      </div>

      {/* Google Nano Image Generation */}
      <div
        style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#fff',
          borderRadius: '6px',
        }}
      >
        <h3 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: '500' }}>
          2. Generate AI Image Prompts (Google Nano Banana Pro)
        </h3>
        <p style={{ marginBottom: '12px', fontSize: '14px', color: '#6c757d' }}>
          Create a text file with detailed visual descriptions for AI image generation.
        </p>

        {!canGenerateImagePrompts && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              marginBottom: '12px',
              fontSize: '14px',
              color: '#856404',
            }}
          >
            ⚠️ Project must have a selected subdivision scenario
          </div>
        )}

        <button
          onClick={handleGenerateImagePrompts}
          disabled={!canGenerateImagePrompts || !targetDirectory || isGeneratingImages}
          style={{
            padding: '10px 20px',
            backgroundColor:
              canGenerateImagePrompts && targetDirectory && !isGeneratingImages
                ? '#17a2b8'
                : '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor:
              canGenerateImagePrompts && targetDirectory && !isGeneratingImages
                ? 'pointer'
                : 'not-allowed',
            fontSize: '14px',
            fontWeight: '500',
            opacity: !canGenerateImagePrompts || !targetDirectory || isGeneratingImages ? 0.6 : 1,
          }}
        >
          {isGeneratingImages ? 'Generating...' : 'Generate AI Image Prompts'}
        </button>

        {lastImagePromptsPath && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#155724',
            }}
          >
            ✓ Last generated: {lastImagePromptsPath}
          </div>
        )}
      </div>

      {/* Import Optimized Subdivision */}
      <div style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '6px' }}>
        <h3 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: '500' }}>
          3. Import Optimized Subdivision from Claude Code
        </h3>
        <p style={{ marginBottom: '12px', fontSize: '14px', color: '#6c757d' }}>
          Load the optimized subdivision layout returned by Claude Code (JSON format).
        </p>

        <button
          onClick={handleImportOptimizedSubdivision}
          disabled={isImporting}
          style={{
            padding: '10px 20px',
            backgroundColor: isImporting ? '#6c757d' : '#ffc107',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: isImporting ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: isImporting ? 0.6 : 1,
          }}
        >
          {isImporting ? 'Importing...' : 'Import Optimized Subdivision from Claude Code'}
        </button>
      </div>

      {/* Manual Workflow Note */}
      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#d1ecf1',
          border: '1px solid #bee5eb',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#0c5460',
        }}
      >
        <strong>📋 Manual Workflow:</strong>
        <ol style={{ marginTop: '8px', marginBottom: '0', paddingLeft: '20px' }}>
          <li>Generate AI prompts using the buttons above</li>
          <li>
            Use the generated files with external AI tools (Claude Code, Google Nano Banana Pro)
          </li>
          <li>Import the results back into the application when ready</li>
        </ol>
        <p style={{ marginTop: '8px', marginBottom: '0' }}>
          <strong>Note:</strong> No automatic AI generation occurs on save or export. You have full
          control over when AI tools are invoked.
        </p>
      </div>
    </div>
  );
};
