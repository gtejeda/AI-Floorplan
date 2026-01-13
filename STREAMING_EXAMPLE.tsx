/**
 * EXAMPLE: How to use AI Streaming Progress in React Components
 *
 * This file shows how to integrate the new streaming progress events
 * into your UI components for real-time feedback during AI generation.
 */

import React, { useState, useEffect } from 'react';
import type { AIGenerationProgressEvent, AIStreamingProgressEvent } from '../shared/ai-contracts';

// Declare the aiService API from preload
declare global {
  interface Window {
    aiService: {
      onGenerationProgress: (callback: (event: AIGenerationProgressEvent) => void) => () => void;
      onStreamingProgress: (callback: (event: AIStreamingProgressEvent) => void) => () => void;
    };
  }
}

interface GenerationProgress {
  planIndex: number;
  totalPlans: number;
  status: 'generating' | 'completed' | 'failed';
  message: string;
  strategy?: string;
}

interface StreamingStatus {
  bytesReceived: number;
  totalChunks: number;
  message: string;
}

/**
 * Example Component: AI Plan Generator with Real-Time Progress
 */
export const AIStreamingExample: React.FC = () => {
  // High-level generation progress (per plan)
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);

  // Real-time streaming progress (bytes received)
  const [streamingStatus, setStreamingStatus] = useState<StreamingStatus | null>(null);

  // Overall completion percentage
  const [completionPercent, setCompletionPercent] = useState<number>(0);

  useEffect(() => {
    console.log('[AIStreaming] Setting up progress listeners...');

    // 1. Listen to high-level generation progress (plan start/complete/fail)
    const unsubscribeGeneration = window.aiService.onGenerationProgress((data) => {
      console.log('[AIStreaming] Generation progress:', data);

      setGenerationProgress({
        planIndex: data.planIndex,
        totalPlans: data.totalPlans,
        status: data.status,
        message: data.message,
        strategy: data.strategy,
      });

      // Update completion percentage
      if (data.status === 'completed') {
        setCompletionPercent((data.planIndex / data.totalPlans) * 100);
      }

      // Reset streaming status when starting new plan
      if (data.status === 'generating') {
        setStreamingStatus({
          bytesReceived: 0,
          totalChunks: 0,
          message: 'Starting generation...',
        });
      }
    });

    // 2. Listen to real-time streaming progress (chunks received)
    const unsubscribeStreaming = window.aiService.onStreamingProgress((data) => {
      console.log('[AIStreaming] Streaming progress:', data);

      setStreamingStatus((prev) => ({
        bytesReceived: data.accumulatedLength,
        totalChunks: (prev?.totalChunks || 0) + 1,
        message: data.message,
      }));
    });

    // Cleanup listeners on unmount
    return () => {
      console.log('[AIStreaming] Cleaning up progress listeners...');
      unsubscribeGeneration();
      unsubscribeStreaming();
    };
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>AI Generation Progress (Streaming Example)</h2>

      {/* High-Level Progress */}
      {generationProgress && (
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3>Plan Generation Progress</h3>
          <p>
            <strong>Status:</strong> {generationProgress.status}
          </p>
          <p>
            <strong>Plan:</strong> {generationProgress.planIndex} of {generationProgress.totalPlans}
          </p>
          <p>
            <strong>Strategy:</strong> {generationProgress.strategy || 'N/A'}
          </p>
          <p>
            <strong>Message:</strong> {generationProgress.message}
          </p>

          {/* Progress Bar */}
          <div style={{ width: '100%', height: '30px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${completionPercent}%`,
                height: '100%',
                backgroundColor: generationProgress.status === 'failed' ? '#ff4444' : '#4caf50',
                transition: 'width 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
              }}
            >
              {completionPercent > 0 ? `${completionPercent.toFixed(0)}%` : ''}
            </div>
          </div>
        </div>
      )}

      {/* Real-Time Streaming Progress */}
      {streamingStatus && generationProgress?.status === 'generating' && (
        <div style={{ padding: '15px', border: '1px solid #2196F3', borderRadius: '8px', backgroundColor: '#E3F2FD' }}>
          <h3>🔄 Streaming in Progress...</h3>
          <p>
            <strong>Bytes Received:</strong> {streamingStatus.bytesReceived.toLocaleString()} bytes
          </p>
          <p>
            <strong>Chunks Received:</strong> {streamingStatus.totalChunks}
          </p>
          <p>
            <strong>Status:</strong> {streamingStatus.message}
          </p>

          {/* Animated progress indicator */}
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#1976D2' }}>
            <span>⏳ Waiting for AI response...</span>
            <span className="dots" style={{ display: 'inline-block', width: '20px' }}>
              {/* Add CSS animation for dots */}
            </span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {generationProgress?.status === 'completed' && (
        <div style={{ padding: '15px', border: '1px solid #4caf50', borderRadius: '8px', backgroundColor: '#E8F5E9', marginTop: '20px' }}>
          <h3>✅ Generation Completed!</h3>
          <p>{generationProgress.message}</p>
        </div>
      )}

      {/* Error Message */}
      {generationProgress?.status === 'failed' && (
        <div style={{ padding: '15px', border: '1px solid #f44336', borderRadius: '8px', backgroundColor: '#FFEBEE', marginTop: '20px' }}>
          <h3>❌ Generation Failed</h3>
          <p>{generationProgress.message}</p>
        </div>
      )}

      {/* Debug Info */}
      <details style={{ marginTop: '30px', padding: '10px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Debug Info</summary>
        <pre style={{ fontSize: '11px', overflow: 'auto' }}>
          {JSON.stringify({ generationProgress, streamingStatus }, null, 2)}
        </pre>
      </details>
    </div>
  );
};

/**
 * INTEGRATION STEPS:
 *
 * 1. Import this pattern into your existing AIPlanGenerator component
 * 2. Add the useEffect hook to set up listeners
 * 3. Update your UI to show progress based on the state
 * 4. Call the AI generation function as usual - events will fire automatically
 *
 * Example integration in AIPlanGenerator.tsx:
 *
 * ```typescript
 * const handleGeneratePlans = async () => {
 *   try {
 *     setIsGenerating(true);
 *
 *     const result = await window.aiService.generateSubdivisionPlan({
 *       projectId: currentProject.id,
 *       landParcelId: landParcel.id,
 *       landWidth: landParcel.width,
 *       landLength: landParcel.length,
 *       landArea: landParcel.area,
 *       socialClubPercent: 15,
 *       count: 3, // Generate 3 plans
 *     });
 *
 *     // Progress events will fire automatically during generation!
 *     // Your listeners will update the UI in real-time
 *
 *     console.log('Generation complete:', result);
 *   } catch (error) {
 *     console.error('Generation failed:', error);
 *   } finally {
 *     setIsGenerating(false);
 *   }
 * };
 * ```
 */

// CSS for animated dots (add to your styles)
const animatedDotsCSS = `
  @keyframes dots {
    0%, 20% { content: '.'; }
    40% { content: '..'; }
    60%, 100% { content: '...'; }
  }

  .dots::after {
    content: '';
    animation: dots 1.5s steps(3, end) infinite;
  }
`;
