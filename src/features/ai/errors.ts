export type AiErrorCode =
  | "missing_api_key"
  | "missing_provider_setting"
  | "provider_http_error"
  | "provider_timeout"
  | "provider_invalid_response"
  | "invalid_ai_output"
  | "invalid_provider_setting";

const AI_ERROR_MESSAGES: Record<AiErrorCode, string> = {
  missing_api_key: "Bạn cần nhập API key trước.",
  missing_provider_setting: "Bạn cần thêm cấu hình AI trước.",
  provider_http_error: "Nhà cung cấp AI đang gặp lỗi. Vui lòng thử lại.",
  provider_timeout: "AI phản hồi quá lâu. Vui lòng thử lại.",
  provider_invalid_response: "AI trả về phản hồi không hợp lệ.",
  invalid_ai_output: "AI chưa đọc được dữ liệu hợp lệ.",
  invalid_provider_setting: "Cấu hình AI không hợp lệ.",
};

export class AiDomainError extends Error {
  constructor(public readonly code: AiErrorCode) {
    super(AI_ERROR_MESSAGES[code]);
    this.name = "AiDomainError";
  }
}

export function getAiErrorMessage(code: AiErrorCode) {
  return AI_ERROR_MESSAGES[code];
}

export function isAiDomainError(error: unknown): error is AiDomainError {
  return error instanceof AiDomainError;
}
