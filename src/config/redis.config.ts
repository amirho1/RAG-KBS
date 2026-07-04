import { registerAs } from "@nestjs/config";
import { getValidatedEnv } from "./validated-env.js";

/**
 * Build a Redis URL from host, port, and optional password.
 * @param host - Redis host.
 * @param port - Redis port.
 * @param password - Optional Redis password.
 * @returns A Redis connection URL.
 */
export function buildRedisUrl(
  host: string,
  port: number,
  password: string
): string {
  if (password.length > 0) {
    return `redis://:${password}@${host}:${port}`;
  }

  return `redis://${host}:${port}`;
}

/**
 * Redis and queue configuration namespace.
 */
export default registerAs("redis", () => {
  const env = getValidatedEnv();

  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    url:
      env.REDIS_URL ??
      buildRedisUrl(env.REDIS_HOST, env.REDIS_PORT, env.REDIS_PASSWORD),
    queuePrefix: env.BULLMQ_QUEUE_PREFIX,
  };
});
