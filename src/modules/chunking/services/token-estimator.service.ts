import { Injectable } from "@nestjs/common";

const averageCharsPerToken = 4;

/**
 * Estimates token counts without provider-specific tokenization.
 */
@Injectable()
export class TokenEstimatorService {
  /**
   * Estimate the token count for text.
   * @param text - Text to estimate.
   * @returns Approximate token count.
   */
  estimate(text: string): number {
    const normalizedLength = text.trim().length;

    if (normalizedLength === 0) {
      return 0;
    }

    return Math.max(1, Math.ceil(normalizedLength / averageCharsPerToken));
  }
}
