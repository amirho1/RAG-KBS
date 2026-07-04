import { sanitizeHealthError } from "./sanitize-health-error.js";

describe("sanitizeHealthError", () => {
  it("should return the fallback message for non-error values", () => {
    expect(sanitizeHealthError("failure", "Safe message")).toBe("Safe message");
  });

  it("should redact PostgreSQL connection strings", () => {
    const message = sanitizeHealthError(
      new Error(
        "connect ECONNREFUSED postgresql://user:secret@localhost:5432/rag_kbs"
      ),
      "PostgreSQL health check failed"
    );

    expect(message).not.toContain("postgresql://");
    expect(message).not.toContain("secret");
  });

  it("should redact Redis connection strings", () => {
    const message = sanitizeHealthError(
      new Error("Connection failed to redis://:password@redis:6379"),
      "Redis health check failed"
    );

    expect(message).not.toContain("redis://");
    expect(message).not.toContain("password");
  });

  it("should remove stack trace suffixes", () => {
    const message = sanitizeHealthError(
      new Error("Timeout\n    at Object.<anonymous> (/app/src/file.ts:10:5)"),
      "Health check failed"
    );

    expect(message).not.toContain("/app/src/file.ts");
    expect(message).toBe("Timeout");
  });
});
