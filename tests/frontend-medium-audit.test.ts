import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("medium frontend checklist regressions", () => {
  it("avoids broad transition-all on audited shared controls", () => {
    const auditedFiles = [
      "src/components/ui/button.tsx",
      "src/components/ui/badge.tsx",
      "src/components/ui/accordion.tsx",
      "src/components/app-nav.tsx",
    ];

    for (const file of auditedFiles) {
      expect(readProjectFile(file)).not.toContain("transition-all");
    }
  });

  it("respects reduced motion preferences on audited animated surfaces", () => {
    const auditedFiles = [
      "src/components/ui/dialog.tsx",
      "src/components/ui/dropdown-menu.tsx",
      "src/components/app-nav.tsx",
      "src/components/app-ui.tsx",
      "src/components/coach-ui.tsx",
    ];

    for (const file of auditedFiles) {
      expect(readProjectFile(file)).toContain("motion-reduce:");
    }
  });
});
