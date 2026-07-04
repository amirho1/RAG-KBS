import { registerAs } from "@nestjs/config";
import { getValidatedEnv } from "./validated-env.js";

/**
 * Database configuration namespace.
 */
export default registerAs("database", () => {
  const env = getValidatedEnv();

  return {
    url: env.DATABASE_URL,
  };
});
