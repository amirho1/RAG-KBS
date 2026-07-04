import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import type { Response } from "express";
import { Observable, type Subscription } from "rxjs";
import {
  attachRequestId,
  buildRequestContext,
} from "../request-context/request-id.js";
import { RequestContextService } from "../request-context/request-context.service.js";
import type { RequestWithContext } from "../request-context/request-context.types.js";

/**
 * Ensures HTTP handlers run with an available request ID.
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  constructor(private readonly requestContextService: RequestContextService) {}

  /**
   * Attach request ID metadata before route handling.
   * @param context - Nest execution context.
   * @param next - Next handler.
   * @returns Handler observable.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestWithContext>();
    const response = httpContext.getResponse<Response>();
    attachRequestId(request, response);
    request.requestContext =
      request.requestContext ?? buildRequestContext(request);

    return new Observable((subscriber) => {
      let subscription: Subscription | undefined;

      this.requestContextService.run(request.requestContext!, () => {
        subscription = next.handle().subscribe(subscriber);
      });

      return () => {
        subscription?.unsubscribe();
      };
    });
  }
}
