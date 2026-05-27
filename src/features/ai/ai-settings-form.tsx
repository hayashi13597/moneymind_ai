"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type AiSettingsFormProps = {
  initialSetting: null | {
    baseUrl: string;
    model: string;
    hasApiKey: boolean;
  };
};

async function readJsonError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return payload?.error ?? "Không thể lưu cấu hình AI.";
}

const NETWORK_ERROR_MESSAGE = "Không thể kết nối máy chủ.";

export function AiSettingsForm({ initialSetting }: AiSettingsFormProps) {
  const [baseUrl, setBaseUrl] = useState(
    initialSetting?.baseUrl ?? "https://api.openai.com/v1",
  );
  const [model, setModel] = useState(initialSetting?.model ?? "gpt-4.1-mini");
  const [hasApiKey, setHasApiKey] = useState(Boolean(initialSetting?.hasApiKey));
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/settings/ai", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          model,
          apiKey: apiKey || undefined,
        }),
      });

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        toast.error(message);
        return;
      }

      const payload = (await response.json()) as {
        setting: { hasApiKey: boolean };
      };
      setHasApiKey(payload.setting.hasApiKey);
      setApiKey("");
      toast.success("Đã lưu cấu hình AI.");
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      toast.error(NETWORK_ERROR_MESSAGE);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={saveSettings}
      className="max-w-2xl space-y-4 rounded-lg border bg-card p-4"
    >
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="baseUrl">
          Base URL
        </label>
        <input
          id="baseUrl"
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="model">
          Model
        </label>
        <input
          id="model"
          value={model}
          onChange={(event) => setModel(event.target.value)}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="apiKey">
          API key
        </label>
        <input
          id="apiKey"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          placeholder={
            hasApiKey
              ? "Đã cấu hình, nhập key mới để thay đổi"
              : "Nhập API key"
          }
          type="password"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          Lưu cấu hình
        </Button>
        <span className="text-sm text-muted-foreground">
          {hasApiKey ? "API key đã cấu hình" : "Chưa có API key"}
        </span>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
