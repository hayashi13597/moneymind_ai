import { readFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function listSourceFiles(directory: string): string[] {
  return readdirSync(join(root, directory)).flatMap((entry) => {
    const path = `${directory}/${entry}`;
    const absolutePath = join(root, path);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      return listSourceFiles(path);
    }

    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

describe("low frontend checklist regressions", () => {
  it("keeps useful browser input hints on account forms", () => {
    const auditedFiles = [
      "src/components/auth/login-form.tsx",
      "src/components/auth/signup-form.tsx",
      "src/features/profile/profile-form.tsx",
      "src/features/profile/password-form.tsx",
    ];

    for (const file of auditedFiles) {
      const source = readProjectFile(file);

      expect(source).toContain("autoComplete");
      expect(source).toContain("placeholder=");
    }

    expect(readProjectFile("src/components/auth/login-form.tsx")).toContain(
      'inputMode="email"',
    );
    expect(readProjectFile("src/components/auth/signup-form.tsx")).toContain(
      'inputMode="email"',
    );
  });

  it("keeps API provider fields explicit for autofill and URL keyboards", () => {
    const source = readProjectFile("src/features/ai/ai-settings-form.tsx");

    expect(source).toContain('autoComplete="off"');
    expect(source).toContain('autoComplete="url"');
    expect(source).toContain('inputMode="url"');
    expect(source).toContain('placeholder="https://api.example.com/v1"');
  });

  it("avoids autofocus on form fields", () => {
    const sourceFiles = listSourceFiles("src");

    for (const file of sourceFiles) {
      const source = readProjectFile(file);

      expect(source).not.toMatch(/\bauto[Ff]ocus\b/);
    }
  });
});
