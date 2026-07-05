import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import type { ConfigType } from "@nestjs/config";
import ingestionConfig from "../../config/ingestion.config.js";
import storageConfig from "../../config/storage.config.js";
import { PrismaModule } from "../database/prisma.module.js";
import { LocalStorageDriver } from "./drivers/local-storage.driver.js";
import { S3StorageDriver } from "./drivers/s3-storage.driver.js";
import type { StorageDriver } from "./interfaces/storage-driver.interface.js";
import { bytesPerMegabyte, storageDriverToken } from "./storage.constants.js";
import { StorageController } from "./storage.controller.js";
import { StorageService } from "./storage.service.js";

/**
 * Binary storage module.
 */
@Module({
  imports: [
    PrismaModule,
    MulterModule.registerAsync({
      inject: [ingestionConfig.KEY],
      useFactory: createMulterOptions,
    }),
  ],
  controllers: [StorageController],
  providers: [
    LocalStorageDriver,
    S3StorageDriver,
    {
      provide: storageDriverToken,
      inject: [storageConfig.KEY, LocalStorageDriver, S3StorageDriver],
      useFactory: createStorageDriver,
    },
    StorageService,
  ],
  exports: [StorageService, storageDriverToken],
})
export class StorageModule {}

/**
 * Create Multer options from validated ingestion config.
 * @param ingestion - Ingestion config.
 * @returns Multer options.
 */
function createMulterOptions(ingestion: ConfigType<typeof ingestionConfig>) {
  return {
    limits: {
      fileSize: ingestion.maxUploadSizeMb * bytesPerMegabyte,
    },
  };
}

/**
 * Select the active storage driver from validated config.
 * @param storage - Storage config.
 * @param localStorageDriver - Local storage driver.
 * @param s3StorageDriver - S3 storage driver.
 * @returns Active storage driver.
 */
function createStorageDriver(
  storage: ConfigType<typeof storageConfig>,
  localStorageDriver: LocalStorageDriver,
  s3StorageDriver: S3StorageDriver
): StorageDriver {
  return storage.driver === "local" ? localStorageDriver : s3StorageDriver;
}
