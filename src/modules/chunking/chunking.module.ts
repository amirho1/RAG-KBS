import { Module } from "@nestjs/common";
import { PrismaModule } from "../database/prisma.module.js";
import { ChunkingConfigService } from "./services/chunking-config.service.js";
import { ChunkingService } from "./services/chunking.service.js";
import { TokenEstimatorService } from "./services/token-estimator.service.js";
import { RecursiveTextChunkingStrategy } from "./strategies/recursive-text-chunking.strategy.js";

/**
 * Document text chunking module.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    TokenEstimatorService,
    RecursiveTextChunkingStrategy,
    ChunkingConfigService,
    ChunkingService,
  ],
  exports: [ChunkingConfigService, ChunkingService, TokenEstimatorService],
})
export class ChunkingModule {}
