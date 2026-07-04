import { Global, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { GlobalExceptionFilter } from "./filters/global-exception.filter.js";
import { RequestIdInterceptor } from "./interceptors/request-id.interceptor.js";
import { JobLoggerService } from "./logger/job-logger.service.js";
import { PinoLoggerService } from "./logger/pino-logger.service.js";
import { RequestLoggerMiddleware } from "./middleware/request-logger.middleware.js";
import { RequestContextService } from "./request-context/request-context.service.js";

/**
 * Shared API and worker observability providers.
 */
@Global()
@Module({
  providers: [
    RequestContextService,
    RequestIdInterceptor,
    GlobalExceptionFilter,
    PinoLoggerService,
    JobLoggerService,
    RequestLoggerMiddleware,
  ],
  exports: [
    RequestContextService,
    RequestIdInterceptor,
    GlobalExceptionFilter,
    PinoLoggerService,
    JobLoggerService,
  ],
})
export class ObservabilityModule implements NestModule {
  /**
   * Register request logging middleware for all API routes.
   * @param consumer - Nest middleware consumer.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes("*");
  }
}
