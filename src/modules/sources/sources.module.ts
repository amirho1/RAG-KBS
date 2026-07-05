import { Module } from "@nestjs/common";
import { PrismaModule } from "../database/prisma.module.js";
import { SourcesController } from "./sources.controller.js";
import { SourcesService } from "./sources.service.js";

/**
 * Source metadata module.
 */
@Module({
  imports: [PrismaModule],
  controllers: [SourcesController],
  providers: [SourcesService],
  exports: [SourcesService],
})
export class SourcesModule {}
