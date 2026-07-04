import {
  generateRequestId,
  isSafeRequestId,
  resolveRequestId,
} from "./request-id.js";

describe("request ID helpers", () => {
  it("should preserve safe incoming request IDs", () => {
    expect(resolveRequestId("external-request-123")).toBe(
      "external-request-123"
    );
  });

  it("should generate a request ID when the incoming value is missing", () => {
    const requestId = resolveRequestId(undefined);

    expect(requestId).toMatch(/^req_[0-9a-f-]+$/);
  });

  it("should reject unsafe request IDs", () => {
    expect(isSafeRequestId("safe.id-123:abc")).toBe(true);
    expect(isSafeRequestId("bad request id")).toBe(false);
    expect(resolveRequestId("bad request id")).toMatch(/^req_/);
  });

  it("should generate unique request IDs", () => {
    expect(generateRequestId()).not.toBe(generateRequestId());
  });
});
