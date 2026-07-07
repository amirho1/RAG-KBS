import { Module } from "@nestjs/common";
import { PrismaModule } from "../database/prisma.module.js";
import { ChunksController, FileChunksController } from "./chunks.controller.js";
import { ChunksService } from "./chunks.service.js";

/**
 * Read-only chunk debug API module.
 */
@Module({
  imports: [PrismaModule],
  controllers: [ChunksController, FileChunksController],
  providers: [ChunksService],
  exports: [ChunksService],
})
export class ChunksModule {}
