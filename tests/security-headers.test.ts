import nextConfig from "@/../next.config";

describe("Next.js security headers", () => {
  it("sets security headers on every route", async () => {
    const headerRules = await nextConfig.headers?.();
    const globalRule = headerRules?.find((rule) => rule.source === "/:path*");
    const headers = new Map(
      globalRule?.headers.map((header) => [header.key, header.value]),
    );

    expect(headers.get("Content-Security-Policy")).toContain(
      "default-src 'self'",
    );
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Strict-Transport-Security")).toContain(
      "max-age=31536000",
    );
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
  });
});
