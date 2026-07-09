import { Global, Module } from "@nestjs/common";
import { IndexingDefaultsService } from "./indexing-defaults.service.js";
import { PrismaService } from "./prisma.service.js";

/**
 * Global Prisma database module.
 */
@Global()
@Module({
  providers: [PrismaService, IndexingDefaultsService],
  exports: [PrismaService, IndexingDefaultsService],
})
export class PrismaModule {}
