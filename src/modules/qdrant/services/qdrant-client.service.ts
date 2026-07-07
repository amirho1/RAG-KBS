import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { QdrantClient } from "@qdrant/js-client-rest";
import qdrantConfig from "../../../config/qdrant.config.js";

/**
 * Owns the Qdrant SDK client instance.
 */
@Injectable()
export class QdrantClientService {
  private readonly client: QdrantClient;

  constructor(
    @Inject(qdrantConfig.KEY)
    private readonly qdrant: ConfigType<typeof qdrantConfig>
  ) {
    this.client = new QdrantClient({
      url: this.qdrant.url,
      apiKey: this.qdrant.apiKey || undefined,
      timeout: toSeconds(this.qdrant.timeoutMs),
      checkCompatibility: false,
    });
  }

  /**
   * Get the shared Qdrant SDK client.
   * @returns Qdrant SDK client.
   */
  getClient(): QdrantClient {
    return this.client;
  }
}

/**
 * Convert milliseconds to SDK timeout seconds.
 * @param timeoutMs - Timeout in milliseconds.
 * @returns Timeout in seconds.
 */
function toSeconds(timeoutMs: number): number {
  return Math.max(1, Math.ceil(timeoutMs / 1_000));
}
