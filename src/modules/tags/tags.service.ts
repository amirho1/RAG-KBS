import { Injectable } from "@nestjs/common";
import { PinoLoggerService } from "../../common/logger/pino-logger.service.js";
import { PrismaService } from "../database/prisma.service.js";
import {
  attachTagToFile,
  attachTagToSource,
  buildListWhere,
  create,
  delete as deleteTag,
  detachTagFromFile,
  detachTagFromSource,
  ensureFileExists,
  ensureFileTagIsAttached,
  ensureFileTagIsNotAttached,
  ensureSourceExists,
  ensureSourceTagIsAttached,
  ensureSourceTagIsNotAttached,
  ensureTagExists,
  ensureTagNameIsAvailable,
  getById,
  list,
  update,
} from "./methods/index.js";

/**
 * Manage searchable metadata tags and tag assignments.
 */
@Injectable()
export class TagsService {
  create: typeof create;
  list: typeof list;
  getById: typeof getById;
  update: typeof update;
  delete: typeof deleteTag;
  attachTagToSource: typeof attachTagToSource;
  detachTagFromSource: typeof detachTagFromSource;
  attachTagToFile: typeof attachTagToFile;
  detachTagFromFile: typeof detachTagFromFile;
  ensureTagExists: typeof ensureTagExists;
  ensureTagNameIsAvailable: typeof ensureTagNameIsAvailable;
  ensureSourceExists: typeof ensureSourceExists;
  ensureFileExists: typeof ensureFileExists;
  ensureSourceTagIsNotAttached: typeof ensureSourceTagIsNotAttached;
  ensureSourceTagIsAttached: typeof ensureSourceTagIsAttached;
  ensureFileTagIsNotAttached: typeof ensureFileTagIsNotAttached;
  ensureFileTagIsAttached: typeof ensureFileTagIsAttached;
  buildListWhere: typeof buildListWhere;

  constructor(
    readonly prisma: PrismaService,
    readonly logger: PinoLoggerService
  ) {
    this.create = create.bind(this) as typeof create;
    this.list = list.bind(this) as typeof list;
    this.getById = getById.bind(this) as typeof getById;
    this.update = update.bind(this) as typeof update;
    this.delete = deleteTag.bind(this) as typeof deleteTag;
    this.attachTagToSource = attachTagToSource.bind(
      this
    ) as typeof attachTagToSource;
    this.detachTagFromSource = detachTagFromSource.bind(
      this
    ) as typeof detachTagFromSource;
    this.attachTagToFile = attachTagToFile.bind(this) as typeof attachTagToFile;
    this.detachTagFromFile = detachTagFromFile.bind(
      this
    ) as typeof detachTagFromFile;
    this.ensureTagExists = ensureTagExists.bind(this) as typeof ensureTagExists;
    this.ensureTagNameIsAvailable = ensureTagNameIsAvailable.bind(
      this
    ) as typeof ensureTagNameIsAvailable;
    this.ensureSourceExists = ensureSourceExists.bind(
      this
    ) as typeof ensureSourceExists;
    this.ensureFileExists = ensureFileExists.bind(
      this
    ) as typeof ensureFileExists;
    this.ensureSourceTagIsNotAttached = ensureSourceTagIsNotAttached.bind(
      this
    ) as typeof ensureSourceTagIsNotAttached;
    this.ensureSourceTagIsAttached = ensureSourceTagIsAttached.bind(
      this
    ) as typeof ensureSourceTagIsAttached;
    this.ensureFileTagIsNotAttached = ensureFileTagIsNotAttached.bind(
      this
    ) as typeof ensureFileTagIsNotAttached;
    this.ensureFileTagIsAttached = ensureFileTagIsAttached.bind(
      this
    ) as typeof ensureFileTagIsAttached;
    this.buildListWhere = buildListWhere.bind(this) as typeof buildListWhere;
  }
}
