import { POST } from "@/app/api/ai/chat/route";
import { generateAiChatResponse } from "@/features/ai-chat/service";
import { getRequiredApiUser } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  getRequiredApiUser: jest.fn(),
  jsonBadRequest: () => Response.json({ error: "Bad request" }, { status: 400 }),
  jsonError: (error: string, status: number) =>
    Response.json({ error }, { status }),
  jsonUnauthorized: () =>
    Response.json({ error: "Unauthorized" }, { status: 401 }),
}));

jest.mock("@/features/ai-chat/service", () => ({
  generateAiChatResponse: jest.fn(),
}));

const getRequiredApiUserMock = getRequiredApiUser as jest.Mock;
const generateAiChatResponseMock = generateAiChatResponse as jest.Mock;

beforeAll(() => {
  global.Response = {
    json: (body: unknown, init?: ResponseInit) => ({
      json: async () => body,
      status: init?.status ?? 200,
    }),
  } as unknown as typeof Response;
});

describe("ai chat route", () => {
  beforeEach(() => {
    getRequiredApiUserMock.mockResolvedValue({ id: "user_1" });
    generateAiChatResponseMock.mockReset();
  });

  it("returns bad request when request JSON is malformed", async () => {
    const request = {
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    } as unknown as Request;

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(generateAiChatResponseMock).not.toHaveBeenCalled();
  });
});
