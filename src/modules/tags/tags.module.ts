import { Module } from "@nestjs/common";
import { PrismaModule } from "../database/prisma.module.js";
import { TagsController } from "./tags.controller.js";
import { TagsService } from "./tags.service.js";

/**
 * Tag metadata module.
 */
@Module({
  imports: [PrismaModule],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
