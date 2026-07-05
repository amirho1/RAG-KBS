/**
 * Minimal Prisma namespace used by unit tests.
 */
export const Prisma = {
  DbNull: Symbol("DbNull"),
  JsonNull: Symbol("JsonNull"),
  PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
    code: string;
    clientVersion: string;
    meta?: Record<string, unknown>;

    /**
     * Create a known Prisma request error mock.
     * @param message - Error message.
     * @param args - Error constructor args.
     */
    constructor(
      message: string,
      args: {
        code: string;
        clientVersion: string;
        meta?: Record<string, unknown>;
      }
    ) {
      super(message);
      this.name = "PrismaClientKnownRequestError";
      this.code = args.code;
      this.clientVersion = args.clientVersion;
      this.meta = args.meta;
    }
  },
};

/**
 * Jest mock for the generated Prisma client.
 */
export class PrismaClient {
  /**
   * Connect to the database.
   */
  async $connect(): Promise<void> {
    await Promise.resolve();
    return undefined;
  }

  /**
   * Disconnect from the database.
   */
  async $disconnect(): Promise<void> {
    await Promise.resolve();
    return undefined;
  }

  /**
   * Execute a raw SQL query.
   */
  async $queryRaw(): Promise<unknown> {
    await Promise.resolve();
    return undefined;
  }
}
