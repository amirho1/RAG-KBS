import type { INestApplication } from "@nestjs/common";
import { ZodValidationPipe } from "nestjs-zod";
import { GlobalExceptionFilter } from "../common/filters/global-exception.filter.js";
import { RequestIdInterceptor } from "../common/interceptors/request-id.interceptor.js";
import { PinoLoggerService } from "../common/logger/pino-logger.service.js";

/**
 * Configure shared API runtime concerns.
 * @param app - Nest application.
 */
export function configureApiApplication(app: INestApplication): void {
  app.useLogger(app.get(PinoLoggerService));
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalInterceptors(app.get(RequestIdInterceptor));
  app.useGlobalFilters(app.get(GlobalExceptionFilter));
}
