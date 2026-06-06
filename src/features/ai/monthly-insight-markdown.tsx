type MonthlyInsightMarkdownProps = {
  content: string;
};

type MarkdownBlock =
  | { kind: "paragraph"; lines: string[] }
  | { kind: "unordered-list"; items: string[] }
  | { kind: "ordered-list"; items: string[] };

function sanitizeMarkdownText(content: string) {
  return content
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "");
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  return sanitizeMarkdownText(content)
    .trim()
    .split(/\n\s*\n/g)
    .map((block): MarkdownBlock => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const unorderedItems = lines
        .map((line) => /^[-*]\s+(.+)$/.exec(line)?.[1] ?? null)
        .filter((item): item is string => Boolean(item));

      if (unorderedItems.length === lines.length) {
        return { kind: "unordered-list", items: unorderedItems };
      }

      const orderedItems = lines
        .map((line) => /^\d+[.)]\s+(.+)$/.exec(line)?.[1] ?? null)
        .filter((item): item is string => Boolean(item));

      if (orderedItems.length === lines.length) {
        return { kind: "ordered-list", items: orderedItems };
      }

      return { kind: "paragraph", lines };
    })
    .filter((block) => {
      if (block.kind === "paragraph") {
        return block.lines.length > 0;
      }

      return block.items.length > 0;
    });
}

export function MonthlyInsightMarkdown({ content }: MonthlyInsightMarkdownProps) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="mt-4 space-y-3 text-sm leading-6">
      {blocks.map((block, blockIndex) => {
        if (block.kind === "unordered-list") {
          return (
            <ul key={blockIndex} className="list-disc space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="pl-1">
                  {renderInlineMarkdown(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.kind === "ordered-list") {
          return (
            <ol key={blockIndex} className="list-decimal space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="pl-1">
                  {renderInlineMarkdown(item)}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={blockIndex}>
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInlineMarkdown(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
