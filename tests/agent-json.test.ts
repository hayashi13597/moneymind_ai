import { parseAgentJsonObject } from "@/features/agent/json";
import { AiDomainError } from "@/features/ai/errors";

describe("agent json parser", () => {
  it("extracts a JSON object from plain content", () => {
    expect(parseAgentJsonObject('{"tool":"transactions.search"}')).toEqual({
      tool: "transactions.search",
    });
  });

  it("extracts a JSON object from markdown fenced content", () => {
    expect(
      parseAgentJsonObject(
        'Đây là kết quả:\n```json\n{"tool":"dashboard.explain","input":{"question":"vì sao?"}}\n```',
      ),
    ).toEqual({
      tool: "dashboard.explain",
      input: { question: "vì sao?" },
    });
  });

  it("ignores a preceding non-JSON brace block and extracts the later object", () => {
    expect(
      parseAgentJsonObject(
        'Ghi chú {not: json}\n```json\n{"tool":"dashboard.explain","input":{"question":"vì sao?"}}\n```',
      ),
    ).toEqual({
      tool: "dashboard.explain",
      input: { question: "vì sao?" },
    });
  });

  it("throws a controlled AI error when no object exists", () => {
    expect(() => parseAgentJsonObject("không phải json")).toThrow(AiDomainError);
  });
});
