/**
 * AIGenerationRequest - Audit trail for AI API calls
 * Tracks requests, responses, errors, costs, and retry chains
 */

export type RequestType = 'subdivision-plan' | 'site-plan-image' | 'aerial-image' | 'context-image';
export type RequestStatus = 'pending' | 'success' | 'failed' | 'retried';

export interface AIGenerationRequest {
  id: string;
  projectId: string;

  // Request metadata
  requestType: RequestType;
  requestedAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
  durationMs?: number;

  // API details
  apiService: string; // e.g., 'gemini', 'dalle-3'
  apiEndpoint: string;
  apiModel: string;

  // Request/response (JSON blobs)
  requestParams: Record<string, any>;
  responseData?: Record<string, any>;

  // Status
  status: RequestStatus;
  errorCode?: string;
  errorMessage?: string;
  retryOfRequestId?: string;

  // Cost tracking
  tokensUsed?: number;
  estimatedCostUsd?: number;
}
