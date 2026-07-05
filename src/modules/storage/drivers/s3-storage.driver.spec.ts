import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { jest } from "@jest/globals";
import { Readable } from "node:stream";
import { S3StorageDriver } from "./s3-storage.driver.js";
import { streamToBuffer } from "../storage.utils.js";

const bucket = "rag-kbs-test";
type S3SendMock = jest.MockedFunction<(command: unknown) => Promise<unknown>>;

/**
 * Create an S3 storage driver for tests.
 * @returns S3 storage driver.
 */
function createS3StorageDriver(): S3StorageDriver {
  return new S3StorageDriver({
    driver: "s3",
    localPath: "",
    s3: {
      endpoint: "http://minio:9000",
      region: "us-east-1",
      bucket,
      accessKeyId: "access-key",
      secretAccessKey: "secret-key",
      forcePathStyle: true,
    },
    allowedUploadMimeTypes: ["text/plain"],
  });
}

describe("S3StorageDriver", () => {
  let sendSpy: S3SendMock;

  beforeEach(() => {
    sendSpy = jest.spyOn(S3Client.prototype, "send") as unknown as S3SendMock;
    sendSpy.mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should upload objects to the configured bucket and key", async () => {
    sendSpy.mockResolvedValueOnce({
      ETag: '"etag"',
      VersionId: "version-1",
    });
    const driver = createS3StorageDriver();
    const body = Buffer.from("hello", "utf8");

    const result = await driver.putObject({
      objectKey: "tenants/tenant/file.txt",
      body,
      sizeBytes: BigInt(body.length),
      checksumSha256:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      contentType: "text/plain",
    });
    const command = sendSpy.mock.calls[0]?.[0] as PutObjectCommand;

    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: bucket,
      Key: "tenants/tenant/file.txt",
      ContentType: "text/plain",
    });
    expect(result).toMatchObject({
      provider: "S3",
      bucket,
      etag: '"etag"',
      versionId: "version-1",
    });
  });

  it("should retrieve object streams", async () => {
    sendSpy.mockResolvedValueOnce({
      Body: Readable.from(Buffer.from("from s3", "utf8")),
    });
    const driver = createS3StorageDriver();

    const result = await driver.getObject({
      objectKey: "tenants/tenant/file.txt",
    });
    const command = sendSpy.mock.calls[0]?.[0] as GetObjectCommand;

    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: bucket,
      Key: "tenants/tenant/file.txt",
    });
    expect(await streamToBuffer(result)).toEqual(
      Buffer.from("from s3", "utf8")
    );
  });

  it("should delete objects from the requested bucket and key", async () => {
    const driver = createS3StorageDriver();

    await driver.deleteObject({
      bucket: "custom-bucket",
      objectKey: "tenants/tenant/file.txt",
    });
    const command = sendSpy.mock.calls[0]?.[0] as DeleteObjectCommand;

    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: "custom-bucket",
      Key: "tenants/tenant/file.txt",
    });
  });

  it("should return false when HeadObject reports a missing object", async () => {
    sendSpy.mockRejectedValueOnce({
      name: "NotFound",
      $metadata: {
        httpStatusCode: 404,
      },
    });
    const driver = createS3StorageDriver();

    await expect(
      driver.exists({ objectKey: "tenants/tenant/missing.txt" })
    ).resolves.toBe(false);
    expect(sendSpy.mock.calls[0]?.[0]).toBeInstanceOf(HeadObjectCommand);
  });

  it("should check bucket reachability for health", async () => {
    const driver = createS3StorageDriver();

    const result = await driver.healthCheck();

    expect(result.status).toBe("ok");
    expect(sendSpy.mock.calls[0]?.[0]).toBeInstanceOf(HeadBucketCommand);
  });

  it("should return unhealthy when bucket reachability fails", async () => {
    sendSpy.mockRejectedValueOnce(new Error("network failed"));
    const driver = createS3StorageDriver();

    const result = await driver.healthCheck();

    expect(result.status).toBe("error");
    expect(result.message).toBe("S3 storage health check failed");
  });
});
