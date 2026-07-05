import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalStorageDriver } from "./local-storage.driver.js";
import { streamToBuffer } from "../storage.utils.js";

/**
 * Create a local storage driver rooted at a temporary directory.
 * @param localPath - Temporary storage path.
 * @returns Local storage driver.
 */
function createLocalStorageDriver(localPath: string): LocalStorageDriver {
  return new LocalStorageDriver({
    driver: "local",
    localPath,
    s3: {
      endpoint: "",
      region: "",
      bucket: "",
      accessKeyId: "",
      secretAccessKey: "",
      forcePathStyle: false,
    },
    allowedUploadMimeTypes: ["text/plain"],
  });
}

describe("LocalStorageDriver", () => {
  let storagePath: string;

  beforeEach(async () => {
    storagePath = await mkdtemp(join(tmpdir(), "rag-kbs-storage-"));
  });

  afterEach(async () => {
    await rm(storagePath, { recursive: true, force: true });
  });

  it("should store and retrieve local objects", async () => {
    const driver = createLocalStorageDriver(storagePath);
    const body = Buffer.from("stored content", "utf8");

    const storedObject = await driver.putObject({
      objectKey: "tenants/tenant/sources/source/file.txt",
      body,
      sizeBytes: BigInt(body.length),
      checksumSha256:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      contentType: "text/plain",
    });

    const readStream = await driver.getObject({
      objectKey: storedObject.objectKey,
    });

    expect(await streamToBuffer(readStream)).toEqual(body);
    expect(await driver.exists({ objectKey: storedObject.objectKey })).toBe(
      true
    );
    expect(
      await readFile(join(storagePath, storedObject.objectKey), "utf8")
    ).toBe("stored content");
  });

  it("should delete local objects", async () => {
    const driver = createLocalStorageDriver(storagePath);

    await driver.putObject({
      objectKey: "tenants/tenant/file.txt",
      body: Buffer.from("delete me", "utf8"),
      sizeBytes: 9n,
      checksumSha256:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });
    await driver.deleteObject({ objectKey: "tenants/tenant/file.txt" });

    expect(await driver.exists({ objectKey: "tenants/tenant/file.txt" })).toBe(
      false
    );
  });

  it("should reject path traversal object keys", async () => {
    const driver = createLocalStorageDriver(storagePath);

    await expect(
      driver.putObject({
        objectKey: "../escape.txt",
        body: Buffer.from("bad", "utf8"),
        sizeBytes: 3n,
        checksumSha256:
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      })
    ).rejects.toThrow("Object key escapes the storage root.");
  });

  it("should return healthy when local read and write work", async () => {
    const driver = createLocalStorageDriver(storagePath);

    const result = await driver.healthCheck();

    expect(result.status).toBe("ok");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
