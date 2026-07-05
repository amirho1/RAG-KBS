import { Module } from "@nestjs/common";
import { PrismaModule } from "../database/prisma.module.js";
import { KnowledgeBasesController } from "./knowledge-bases.controller.js";
import { KnowledgeBasesService } from "./knowledge-bases.service.js";

/**
 * Knowledge base metadata module.
 */
@Module({
  imports: [PrismaModule],
  controllers: [KnowledgeBasesController],
  providers: [KnowledgeBasesService],
  exports: [KnowledgeBasesService],
})
export class KnowledgeBasesModule {}
