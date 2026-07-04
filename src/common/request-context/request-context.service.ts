import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestContext } from "./request-context.types.js";

/**
 * Stores request-scoped metadata for async work started by HTTP requests.
 */
@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  /**
   * Run a callback inside a request context.
   * @param context - Request context.
   * @param callback - Work to run inside the context.
   * @returns The callback result.
   */
  run<Result>(context: RequestContext, callback: () => Result): Result {
    return this.storage.run(context, callback);
  }

  /**
   * Get the active request context.
   * @returns The active context, if one exists.
   */
  getContext(): RequestContext | undefined {
    return this.storage.getStore();
  }

  /**
   * Get the active request ID.
   * @returns The request ID, if one exists.
   */
  getRequestId(): string | undefined {
    return this.getContext()?.requestId;
  }
}
