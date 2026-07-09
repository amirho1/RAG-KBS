import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import {
  resolveDefaultSeedConfig,
  upsertDefaultIndexingRecords,
  type DefaultSeedConfig,
} from "../src/modules/database/seed-defaults.js";

config();

/**
 * Seed safe default database records for RAG-KBS.
 */
async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed the database.");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$connect();
    await seedDefaultRecords(prisma, resolveDefaultSeedConfig(process.env));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

/**
 * Upsert default RAG database records.
 * @param prisma - Prisma client.
 * @param seedConfig - Resolved seed configuration.
 */
export async function seedDefaultRecords(
  prisma: PrismaClient,
  seedConfig: DefaultSeedConfig
): Promise<void> {
  await upsertDefaultIndexingRecords(prisma, seedConfig);
}

/**
 * Remove credentials from database-related seed errors.
 * @param error - The seed error.
 * @returns The sanitized error message.
 */
function sanitizeSeedError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return message.replace(
    /postgres(?:ql)?:\/\/[^@\s]+@/gi,
    "postgresql://<credentials>@"
  );
}

void main().catch((error) => {
  console.error("Database seed failed.");
  console.error(sanitizeSeedError(error));
  process.exitCode = 1;
});
