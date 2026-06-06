import { POST } from "@/app/api/agent/route";
import { isAiDomainError } from "@/features/ai/errors";
import { generateAgentResponse } from "@/features/agent/service";
import { getRequiredApiUser } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  getRequiredApiUser: jest.fn(),
  jsonBadRequest: (error = "Bad request") =>
    Response.json({ error }, { status: 400 }),
  jsonError: (error: string, status: number) =>
    Response.json({ error }, { status }),
  jsonUnauthorized: () =>
    Response.json({ error: "Unauthorized" }, { status: 401 }),
}));

jest.mock("@/features/agent/service", () => ({
  generateAgentResponse: jest.fn(),
}));

jest.mock("@/features/ai/errors", () => ({
  AiDomainError: class AiDomainError extends Error {
    code: string;

    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
  getAiErrorMessage: () => "AI trả về phản hồi không hợp lệ.",
  isAiDomainError: jest.fn(),
}));

const getRequiredApiUserMock = getRequiredApiUser as jest.Mock;
const generateAgentResponseMock = generateAgentResponse as jest.Mock;
const isAiDomainErrorMock = isAiDomainError as unknown as jest.Mock;
const originalResponse = global.Response;

beforeAll(() => {
  global.Response = {
    json: (body: unknown, init?: ResponseInit) => ({
      json: async () => body,
      status: init?.status ?? 200,
    }),
  } as unknown as typeof Response;
});

afterAll(() => {
  global.Response = originalResponse;
});

describe("agent route", () => {
  beforeEach(() => {
    getRequiredApiUserMock.mockResolvedValue({ id: "user_1" });
    isAiDomainErrorMock.mockReset();
    isAiDomainErrorMock.mockImplementation(
      (error) => Boolean(error) && typeof error === "object" && "code" in error,
    );
    generateAgentResponseMock.mockReset();
    generateAgentResponseMock.mockResolvedValue({
      message: { role: "assistant", content: "Bạn chi nhiều nhất cho ăn uống." },
      resultType: "answer",
    });
  });

  it("returns unauthorized without a user", async () => {
    getRequiredApiUserMock.mockResolvedValue(null);

    const response = await POST({
      json: async () => ({}),
    } as Request);

    expect(response.status).toBe(401);
    expect(generateAgentResponseMock).not.toHaveBeenCalled();
  });

  it("returns bad request when request JSON is malformed", async () => {
    const response = await POST(({
      json: async () => {
        throw new SyntaxError("bad json");
      },
    } as unknown) as Request);

    expect(response.status).toBe(400);
    expect(generateAgentResponseMock).not.toHaveBeenCalled();
  });

  it("rejects unsafe provider base URLs before calling service", async () => {
    const response = await POST({
      json: async () => ({
        month: "2026-06",
        providerSetting: {
          baseUrl: "http://127.0.0.1:11434/v1",
          apiKey: "sk-local",
          model: "local",
        },
        messages: [{ role: "user", content: "Tôi chi gì nhiều nhất?" }],
      }),
    } as Request);

    expect(response.status).toBe(400);
    expect(generateAgentResponseMock).not.toHaveBeenCalled();
  });

  it("returns agent response", async () => {
    const requestBody = {
      month: "2026-06",
      providerSetting: {
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: "sk-test",
        model: "openai/gpt-4o-mini",
      },
      messages: [{ role: "user", content: "Tôi chi gì nhiều nhất?" }],
    };

    const response = await POST({
      json: async () => requestBody,
    } as Request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.resultType).toBe("answer");
    expect(generateAgentResponseMock).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ month: "2026-06" }),
      expect.objectContaining({ model: "openai/gpt-4o-mini" }),
    );
  });

  it("maps AI-domain service errors to bad request responses", async () => {
    const requestBody = {
      month: "2026-06",
      providerSetting: {
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: "sk-test",
        model: "openai/gpt-4o-mini",
      },
      messages: [{ role: "user", content: "Tôi chi gì nhiều nhất?" }],
    };
    generateAgentResponseMock.mockRejectedValue(new Error("provider error"));
    isAiDomainErrorMock.mockReturnValue(true);

    const response = await POST({
      json: async () => requestBody,
    } as Request);

    expect(response.status).toBe(400);
    expect(generateAgentResponseMock).toHaveBeenCalled();
  });
});
