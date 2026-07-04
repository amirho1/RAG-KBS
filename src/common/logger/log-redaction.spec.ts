import {
  redactSensitiveValue,
  sanitizeError,
  sanitizeLogMessage,
} from "./log-redaction.js";

describe("log redaction", () => {
  it("should redact secrets and document content from structured values", () => {
    const result = redactSensitiveValue({
      tenantId: "tenant_1",
      apiKey: "secret-value",
      rawText: "full parsed document",
      nested: {
        password: "super-secret",
      },
    });

    expect(result).toEqual({
      tenantId: "tenant_1",
      apiKey: "[redacted]",
      rawText: "[redacted]",
      nested: {
        password: "[redacted]",
      },
    });
  });

  it("should redact connection strings and tokens in messages", () => {
    const message = sanitizeLogMessage(
      "failed postgresql://user:pass@localhost:5432/db bearer abcdefghijklmnopqrstuvwxyz"
    );

    expect(message).not.toContain("user:pass");
    expect(message).not.toContain("abcdefghijklmnopqrstuvwxyz");
  });

  it("should build safe error summaries without stacks", () => {
    const error = new Error(
      "failed with password=secret postgresql://user:pass@localhost/db"
    );
    const summary = sanitizeError(error);

    expect(summary.message).not.toContain("secret");
    expect(summary.message).not.toContain("user:pass");
    expect(summary).not.toHaveProperty("stack");
  });
});
