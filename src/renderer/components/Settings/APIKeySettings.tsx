import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../common/LoadingSpinner';
import './APIKeySettings.css';

export interface APIKeyStatus {
  isSet: boolean;
  isValid: boolean | null; // null = not tested yet
  lastTested?: string;
  error?: string;
}

export interface APIKeySettingsProps {
  onSave?: () => void;
}

/**
 * API Key Settings component with secure input fields
 * Manages Gemini and Image generation API keys
 */
export function APIKeySettings({ onSave }: APIKeySettingsProps): JSX.Element {
  const [geminiKey, setGeminiKey] = useState('');
  const [imageKey, setImageKey] = useState('');
  const [geminiStatus, setGeminiStatus] = useState<APIKeyStatus>({
    isSet: false,
    isValid: null,
  });
  const [imageStatus, setImageStatus] = useState<APIKeyStatus>({
    isSet: false,
    isValid: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState<'gemini' | 'image' | null>(null);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    loadAPIKeyStatus();
  }, []);

  const loadAPIKeyStatus = async () => {
    try {
      const settings = await window.aiService.getSettings();

      setGeminiStatus({
        isSet: !!settings.geminiApiKey,
        isValid: null,
      });

      setImageStatus({
        isSet: !!settings.imageApiKey,
        isValid: null,
      });
    } catch (error) {
      console.error('Failed to load API key status:', error);
    }
  };

  const handleSaveKeys = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      if (geminiKey.trim()) {
        await window.aiService.setApiKey('gemini', geminiKey.trim());
      }

      if (imageKey.trim()) {
        await window.aiService.setApiKey('image', imageKey.trim());
      }

      // Clear input fields
      setGeminiKey('');
      setImageKey('');

      // Reload status
      await loadAPIKeyStatus();

      setSaveMessage({
        type: 'success',
        text: 'API keys saved successfully!',
      });

      onSave?.();
    } catch (error: any) {
      setSaveMessage({
        type: 'error',
        text: error.message || 'Failed to save API keys',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestKey = async (keyType: 'gemini' | 'image') => {
    setIsTesting(keyType);

    try {
      const result = await window.aiService.testApiKey(keyType);

      if (keyType === 'gemini') {
        setGeminiStatus({
          ...geminiStatus,
          isValid: result.valid,
          lastTested: new Date().toISOString(),
          error: result.error,
        });
      } else {
        setImageStatus({
          ...imageStatus,
          isValid: result.valid,
          lastTested: new Date().toISOString(),
          error: result.error,
        });
      }
    } catch (error: any) {
      const status = {
        isSet: true,
        isValid: false,
        lastTested: new Date().toISOString(),
        error: error.message || 'Test failed',
      };

      if (keyType === 'gemini') {
        setGeminiStatus(status);
      } else {
        setImageStatus(status);
      }
    } finally {
      setIsTesting(null);
    }
  };

  return (
    <div className="api-key-settings">
      <div className="api-key-settings__header">
        <h3 className="api-key-settings__title">AI API Configuration</h3>
        <p className="api-key-settings__description">
          Configure your API keys for Gemini (text generation) and image generation services. Keys
          are encrypted and stored securely.
        </p>
      </div>

      {/* Gemini API Key */}
      <div className="api-key-settings__section">
        <label className="api-key-settings__label" htmlFor="gemini-key">
          Gemini API Key
          <span className="api-key-settings__status">
            {geminiStatus.isSet && <StatusIndicator status={geminiStatus} />}
          </span>
        </label>

        <div className="api-key-settings__input-group">
          <input
            id="gemini-key"
            type="password"
            className="api-key-settings__input"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder={geminiStatus.isSet ? '••••••••••••••••' : 'Enter your Gemini API key'}
          />

          {geminiStatus.isSet && (
            <button
              className="api-key-settings__test-button"
              onClick={() => handleTestKey('gemini')}
              disabled={isTesting === 'gemini'}
            >
              {isTesting === 'gemini' ? 'Testing...' : 'Test Key'}
            </button>
          )}
        </div>

        {geminiStatus.error && <p className="api-key-settings__error">❌ {geminiStatus.error}</p>}

        <p className="api-key-settings__help">
          Get your API key from{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google AI Studio
          </a>
        </p>
      </div>

      {/* Image API Key */}
      <div className="api-key-settings__section">
        <label className="api-key-settings__label" htmlFor="image-key">
          Image Generation API Key
          <span className="api-key-settings__status">
            {imageStatus.isSet && <StatusIndicator status={imageStatus} />}
          </span>
        </label>

        <div className="api-key-settings__input-group">
          <input
            id="image-key"
            type="password"
            className="api-key-settings__input"
            value={imageKey}
            onChange={(e) => setImageKey(e.target.value)}
            placeholder={imageStatus.isSet ? '••••••••••••••••' : 'Enter your image API key'}
          />

          {imageStatus.isSet && (
            <button
              className="api-key-settings__test-button"
              onClick={() => handleTestKey('image')}
              disabled={isTesting === 'image'}
            >
              {isTesting === 'image' ? 'Testing...' : 'Test Key'}
            </button>
          )}
        </div>

        {imageStatus.error && <p className="api-key-settings__error">❌ {imageStatus.error}</p>}

        <p className="api-key-settings__help">
          Get your API key from{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
            OpenAI Platform
          </a>{' '}
          (DALL-E 3)
        </p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`api-key-settings__message api-key-settings__message--${saveMessage.type}`}>
          {saveMessage.text}
        </div>
      )}

      {/* Actions */}
      <div className="api-key-settings__actions">
        <button
          className="api-key-settings__save-button"
          onClick={handleSaveKeys}
          disabled={isSaving || (!geminiKey.trim() && !imageKey.trim())}
        >
          {isSaving ? <LoadingSpinner size="small" message="Saving..." /> : 'Save API Keys'}
        </button>
      </div>
    </div>
  );
}

/**
 * Status Indicator component
 */
function StatusIndicator({ status }: { status: APIKeyStatus }): JSX.Element {
  if (status.isValid === null) {
    return <span className="status-indicator status-indicator--unknown">Not tested</span>;
  }

  if (status.isValid) {
    return <span className="status-indicator status-indicator--valid">✓ Valid</span>;
  }

  return <span className="status-indicator status-indicator--invalid">✕ Invalid</span>;
}
