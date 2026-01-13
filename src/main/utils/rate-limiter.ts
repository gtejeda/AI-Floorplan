/**
 * Rate Limiter - Token Bucket Algorithm
 *
 * Implements client-side rate limiting to prevent exceeding API quotas
 * for Gemini and image generation services.
 *
 * Based on the token bucket algorithm with configurable capacity and refill rate.
 */

export interface TokenBucketConfig {
  capacity: number; // Max tokens in bucket
  refillRate: number; // Tokens added per second
  refillInterval: number; // Milliseconds between refills
}

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private config: TokenBucketConfig;

  constructor(config: TokenBucketConfig) {
    this.config = config;
    this.tokens = config.capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Attempts to consume tokens from the bucket
   * @param tokensNeeded Number of tokens to consume (default: 1)
   * @returns true if tokens were consumed, false if insufficient tokens
   */
  tryConsume(tokensNeeded: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokensNeeded) {
      this.tokens -= tokensNeeded;
      return true;
    }

    return false;
  }

  /**
   * Calculates wait time until enough tokens are available
   * @param tokensNeeded Number of tokens needed
   * @returns Wait time in milliseconds (0 if tokens available now)
   */
  getWaitTime(tokensNeeded: number = 1): number {
    this.refill();

    if (this.tokens >= tokensNeeded) {
      return 0;
    }

    const tokensShort = tokensNeeded - this.tokens;
    return (tokensShort / this.config.refillRate) * 1000; // milliseconds
  }

  /**
   * Gets current token count
   */
  getTokenCount(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Resets the bucket to full capacity
   */
  reset(): void {
    this.tokens = this.config.capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Refills tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.config.refillInterval) {
      const intervalsElapsed = Math.floor(elapsed / this.config.refillInterval);
      const tokensToAdd = intervalsElapsed * this.config.refillRate;

      this.tokens = Math.min(this.config.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
}

/**
 * Rate limiter for Gemini API (free tier: 10 RPM)
 * Uses 80% safety margin (8 requests/minute)
 */
export const geminiRateLimiter = new TokenBucket({
  capacity: 10, // 10 requests max
  refillRate: 10 / 60, // 10 per minute = 0.167 per second
  refillInterval: 1000, // Check every second
});

/**
 * Rate limiter for Image Generation API (conservative: 5 RPM)
 */
export const imageRateLimiter = new TokenBucket({
  capacity: 5, // 5 requests max
  refillRate: 5 / 60, // 5 per minute
  refillInterval: 1000,
});

/**
 * Checks Gemini rate limit and throws error if exceeded
 * @throws Error if rate limit exceeded
 */
export async function checkGeminiRateLimit(): Promise<void> {
  if (!geminiRateLimiter.tryConsume()) {
    const waitTime = geminiRateLimiter.getWaitTime();
    throw new Error(
      `Gemini rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`
    );
  }
}

/**
 * Checks image generation rate limit and throws error if exceeded
 * @throws Error if rate limit exceeded
 */
export async function checkImageRateLimit(): Promise<void> {
  if (!imageRateLimiter.tryConsume()) {
    const waitTime = imageRateLimiter.getWaitTime();
    throw new Error(
      `Image generation rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`
    );
  }
}

/**
 * Gets current rate limit status for UI display
 */
export function getRateLimitStatus(): {
  gemini: { available: number; capacity: number; waitTime: number };
  image: { available: number; capacity: number; waitTime: number };
} {
  return {
    gemini: {
      available: Math.floor(geminiRateLimiter.getTokenCount()),
      capacity: 10,
      waitTime: geminiRateLimiter.getWaitTime(),
    },
    image: {
      available: Math.floor(imageRateLimiter.getTokenCount()),
      capacity: 5,
      waitTime: imageRateLimiter.getWaitTime(),
    },
  };
}
