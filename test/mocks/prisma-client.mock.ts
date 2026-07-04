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
