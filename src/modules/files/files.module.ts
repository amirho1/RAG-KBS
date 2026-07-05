import { Module } from "@nestjs/common";
import { PrismaModule } from "../database/prisma.module.js";
import { FilesController } from "./files.controller.js";
import { FilesService } from "./files.service.js";

/**
 * Document file metadata module.
 */
@Module({
  imports: [PrismaModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
