import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  calculateSha256,
  createStorageObjectKey,
  getSafeOriginalName,
  isMimeTypeAllowed,
  resolveSafeLocalObjectPath,
} from "./storage.utils.js";

describe("storage utils", () => {
  it("should calculate SHA-256 checksums", () => {
    const checksum = calculateSha256(Buffer.from("hello", "utf8"));

    expect(checksum).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("should create safe object keys without trusting tenant or source path text", () => {
    const objectKey = createStorageObjectKey({
      tenantId: "tenant/../../acme",
      sourceId: "../source",
      checksumSha256:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      originalName: "../../manual.pdf",
      mimeType: "application/pdf",
      now: new Date("2026-07-05T12:00:00.000Z"),
    });

    expect(objectKey).toContain("tenants/tenant-..-..-acme/sources/..-source");
    expect(objectKey).toContain("year=2026/month=07");
    expect(objectKey).toMatch(/\.pdf$/);
    expect(objectKey).not.toContain("/../");
  });

  it("should reject local path traversal object keys", () => {
    const rootPath = join(tmpdir(), "rag-kbs-storage-utils");

    expect(() =>
      resolveSafeLocalObjectPath(rootPath, "../outside.txt")
    ).toThrow("Object key escapes the storage root.");
    expect(() =>
      resolveSafeLocalObjectPath(rootPath, "tenant/../../outside.txt")
    ).toThrow("Object key escapes the storage root.");
  });

  it("should keep only the filename portion of original names", () => {
    expect(getSafeOriginalName("../../manual.pdf")).toBe("manual.pdf");
    expect(getSafeOriginalName("C:\\temp\\manual.pdf")).toBe("manual.pdf");
  });

  it("should check MIME types against normalized allowlists", () => {
    expect(isMimeTypeAllowed("Text/Plain", ["text/plain"])).toBe(true);
    expect(isMimeTypeAllowed("application/x-msdownload", ["text/plain"])).toBe(
      false
    );
  });
});
