import { Module } from "@nestjs/common";
import { PrismaModule } from "../database/prisma.module.js";
import { StorageObjectsController } from "./storage-objects.controller.js";
import { StorageObjectsService } from "./storage-objects.service.js";

/**
 * Storage object metadata module.
 */
@Module({
  imports: [PrismaModule],
  controllers: [StorageObjectsController],
  providers: [StorageObjectsService],
  exports: [StorageObjectsService],
})
export class StorageObjectsModule {}
