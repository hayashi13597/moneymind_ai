import { AiDomainError } from "@/features/ai/errors";

function extractJsonObject(content: string) {
  for (
    let start = content.indexOf("{");
    start !== -1;
    start = content.indexOf("{", start + 1)
  ) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < content.length; index += 1) {
      const char = content[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === "{") {
        depth += 1;
      }

      if (char === "}") {
        depth -= 1;

        if (depth === 0) {
          return content.slice(start, index + 1);
        }
      }
    }
  }

  return null;
}

export function parseAgentJsonObject(content: string) {
  const jsonContent = extractJsonObject(content);

  if (!jsonContent) {
    throw new AiDomainError("provider_invalid_response");
  }

  try {
    return JSON.parse(jsonContent) as unknown;
  } catch {
    throw new AiDomainError("provider_invalid_response");
  }
}
