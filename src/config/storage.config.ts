import { registerAs } from "@nestjs/config";
import { getValidatedEnv } from "./validated-env.js";

/**
 * Object storage configuration namespace.
 */
export default registerAs("storage", () => {
  const env = getValidatedEnv();

  return {
    driver: env.STORAGE_DRIVER,
    localPath: env.LOCAL_STORAGE_PATH,
    s3: {
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      bucket: env.S3_BUCKET,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    },
  };
});
