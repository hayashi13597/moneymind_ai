import nextConfig from "@/../next.config";

describe("Next.js security headers", () => {
  it("sets security headers on every route", async () => {
    const headerRules = await nextConfig.headers?.();
    const globalRule = headerRules?.find((rule) => rule.source === "/:path*");
    const headers = new Map(
      globalRule?.headers.map((header) => [header.key, header.value]),
    );

    const contentSecurityPolicy = headers.get("Content-Security-Policy");
    expect(contentSecurityPolicy).toContain("frame-ancestors 'none'");
    expect(contentSecurityPolicy).toContain("form-action 'self'");
    expect(contentSecurityPolicy).not.toContain("'unsafe-inline'");
    expect(contentSecurityPolicy).not.toContain("'unsafe-eval'");
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
