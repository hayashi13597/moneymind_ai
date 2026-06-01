import { isIP } from "node:net";

import { AiDomainError } from "@/features/ai/errors";
import type { AiProviderSettingInput } from "@/features/ai/schemas";

function isReservedIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));
  const [first, second = 0, third = 0] = parts;

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 &&
      (second === 168 ||
        (second === 0 && third === 0) ||
        (second === 0 && third === 2))) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113)
  );
}

function isReservedIpv6(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8")
  );
}

export function isSafeAiProviderBaseUrl(baseUrl: string) {
  let url: URL;

  try {
    url = new URL(baseUrl);
  } catch {
    return false;
  }

  const hostname = url.hostname.replace(/\.$/, "").toLowerCase();

  if (
    url.protocol !== "https:" ||
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost")
  ) {
    return false;
  }

  const ipVersion = isIP(hostname.replace(/^\[|\]$/g, ""));

  if (ipVersion === 4) {
    return !isReservedIpv4(hostname);
  }

  if (ipVersion === 6) {
    return !isReservedIpv6(hostname);
  }

  return true;
}

export function assertSafeAiProviderSetting(setting: AiProviderSettingInput) {
  if (!isSafeAiProviderBaseUrl(setting.baseUrl)) {
    throw new AiDomainError("invalid_provider_setting");
  }

  return setting;
}
