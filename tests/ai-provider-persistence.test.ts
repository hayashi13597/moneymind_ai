import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("AI provider persistence", () => {
  it("does not keep AI provider settings in the database schema", () => {
    const schema = readFileSync(
      join(process.cwd(), "prisma/schema.prisma"),
      "utf8",
    );

    expect(schema).not.toContain("model AiProviderSetting");
    expect(schema).not.toContain("aiProviderSetting");
  });
});
