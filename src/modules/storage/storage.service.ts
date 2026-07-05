import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import ingestionConfig from "../../config/ingestion.config.js";
import storageConfig from "../../config/storage.config.js";
import { RequestContextService } from "../../common/request-context/request-context.service.js";
import { PinoLoggerService } from "../../common/logger/pino-logger.service.js";
import { PrismaService } from "../database/prisma.service.js";
import type { StorageDriver } from "./interfaces/storage-driver.interface.js";
import {
  createDocumentFile,
  createStorageObject,
  deleteStoredObject,
  ensureFileChecksumIsAvailable,
  ensureProviderMatchesConfig,
  ensureSourceExists,
  ensureStorageObjectExists,
  ensureStorageObjectHasNoActiveFiles,
  findReusableStorageObject,
  getConfiguredProvider,
  getFileBuffer,
  getFileStream,
  healthCheck,
  isConfiguredProvider,
  storageObjectExists,
  storeNewObject,
  uploadFile,
  validateUploadedFile,
} from "./methods/index.js";
import { storageDriverToken } from "./storage.constants.js";

/**
 * Stores uploaded binaries and coordinates storage metadata persistence.
 */
@Injectable()
export class StorageService {
  uploadFile: typeof uploadFile;
  getFileStream: typeof getFileStream;
  getFileBuffer: typeof getFileBuffer;
  deleteStoredObject: typeof deleteStoredObject;
  storageObjectExists: typeof storageObjectExists;
  healthCheck: typeof healthCheck;
  validateUploadedFile: typeof validateUploadedFile;
  ensureSourceExists: typeof ensureSourceExists;
  ensureFileChecksumIsAvailable: typeof ensureFileChecksumIsAvailable;
  findReusableStorageObject: typeof findReusableStorageObject;
  storeNewObject: typeof storeNewObject;
  createStorageObject: typeof createStorageObject;
  createDocumentFile: typeof createDocumentFile;
  ensureStorageObjectExists: typeof ensureStorageObjectExists;
  ensureStorageObjectHasNoActiveFiles: typeof ensureStorageObjectHasNoActiveFiles;
  ensureProviderMatchesConfig: typeof ensureProviderMatchesConfig;
  isConfiguredProvider: typeof isConfiguredProvider;
  getConfiguredProvider: typeof getConfiguredProvider;

  constructor(
    readonly prisma: PrismaService,
    readonly logger: PinoLoggerService,
    readonly requestContextService: RequestContextService,
    @Inject(storageDriverToken)
    readonly storageDriver: StorageDriver,
    @Inject(storageConfig.KEY)
    readonly storage: ConfigType<typeof storageConfig>,
    @Inject(ingestionConfig.KEY)
    readonly ingestion: ConfigType<typeof ingestionConfig>
  ) {
    this.uploadFile = uploadFile.bind(this) as typeof uploadFile;
    this.getFileStream = getFileStream.bind(this) as typeof getFileStream;
    this.getFileBuffer = getFileBuffer.bind(this) as typeof getFileBuffer;
    this.deleteStoredObject = deleteStoredObject.bind(
      this
    ) as typeof deleteStoredObject;
    this.storageObjectExists = storageObjectExists.bind(
      this
    ) as typeof storageObjectExists;
    this.healthCheck = healthCheck.bind(this) as typeof healthCheck;
    this.validateUploadedFile = validateUploadedFile.bind(
      this
    ) as typeof validateUploadedFile;
    this.ensureSourceExists = ensureSourceExists.bind(
      this
    ) as typeof ensureSourceExists;
    this.ensureFileChecksumIsAvailable = ensureFileChecksumIsAvailable.bind(
      this
    ) as typeof ensureFileChecksumIsAvailable;
    this.findReusableStorageObject = findReusableStorageObject.bind(
      this
    ) as typeof findReusableStorageObject;
    this.storeNewObject = storeNewObject.bind(this) as typeof storeNewObject;
    this.createStorageObject = createStorageObject.bind(
      this
    ) as typeof createStorageObject;
    this.createDocumentFile = createDocumentFile.bind(
      this
    ) as typeof createDocumentFile;
    this.ensureStorageObjectExists = ensureStorageObjectExists.bind(
      this
    ) as typeof ensureStorageObjectExists;
    this.ensureStorageObjectHasNoActiveFiles =
      ensureStorageObjectHasNoActiveFiles.bind(
        this
      ) as typeof ensureStorageObjectHasNoActiveFiles;
    this.ensureProviderMatchesConfig = ensureProviderMatchesConfig.bind(
      this
    ) as typeof ensureProviderMatchesConfig;
    this.isConfiguredProvider = isConfiguredProvider.bind(
      this
    ) as typeof isConfiguredProvider;
    this.getConfiguredProvider = getConfiguredProvider.bind(
      this
    ) as typeof getConfiguredProvider;
  }
}
