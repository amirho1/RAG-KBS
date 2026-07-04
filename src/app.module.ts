import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { ObservabilityModule } from "./common/observability.module.js";
import { AppConfigModule } from "./config/config.module.js";
import { HealthModule } from "./modules/health/health.module.js";

@Module({
  imports: [AppConfigModule, ObservabilityModule, HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
