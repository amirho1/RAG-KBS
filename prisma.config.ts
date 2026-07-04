import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env file only if DATABASE_URL is not already set (for local development)
// In Docker, environment variables are set directly, so this won't interfere
if (!process.env.DATABASE_URL) {
  config();
}

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
