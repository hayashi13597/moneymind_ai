"use client";

import {
  Bot,
  CheckCircle2,
  KeyRound,
  Pencil,
  Plus,
  Server,
  Trash2,
} from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { InsightCard, SectionCard } from "@/components/app-ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  createLocalAiProviderId,
  DEFAULT_AI_PROVIDER_SETTING,
  deleteLocalAiProvider,
  EMPTY_AI_PROVIDER_STORE,
  type LocalAiProvider,
  readLocalAiProviderStore,
  saveLocalAiProvider,
  selectLocalAiProvider,
  subscribeLocalAiProviderStore,
} from "@/features/ai/local-settings";
import { createZodResolver } from "@/lib/zod-form";

const MISSING_API_KEY_MESSAGE = "Bạn cần cấu hình API key AI trước.";
const FIELD_LABEL_CLASS_NAME = "inline-flex items-center gap-2";
const CONTROL_CLASS_NAME =
  "h-11 w-full rounded-xl border border-[#DCD7CC] bg-[#FDFCF8] px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15";
const aiProviderFormSchema = z.object({
  name: z.string().trim().min(1, "Tên provider là bắt buộc."),
  baseUrl: z.url("Base URL không hợp lệ."),
  model: z.string().trim().min(1, "Model là bắt buộc."),
  apiKey: z.string(),
});

type DraftProvider = Omit<LocalAiProvider, "apiKey"> & {
  apiKey: string;
};
type AiProviderFormValues = z.infer<typeof aiProviderFormSchema>;

function getServerAiProviderStoreSnapshot() {
  return EMPTY_AI_PROVIDER_STORE;
}

function createDraftProviderName(providerCount: number) {
  return providerCount === 0 ? "Provider chính" : `Provider ${providerCount + 1}`;
}

function createDefaultDraftProvider(
  providerCount: number,
  id = "",
): DraftProvider {
  return {
    id,
    name: createDraftProviderName(providerCount),
    baseUrl: DEFAULT_AI_PROVIDER_SETTING.baseUrl,
    model: DEFAULT_AI_PROVIDER_SETTING.model,
    apiKey: "",
  };
}

function toDraftProvider(provider: LocalAiProvider): DraftProvider {
  return {
    id: provider.id,
    name: provider.name,
    baseUrl: provider.baseUrl,
    model: provider.model,
    apiKey: "",
  };
}

export function AiSettingsForm() {
  const store = useSyncExternalStore(
    subscribeLocalAiProviderStore,
    readLocalAiProviderStore,
    getServerAiProviderStoreSnapshot,
  );
  const selectedProvider =
    store.providers.find(
      (provider) => provider.id === store.selectedProviderId,
    ) ?? store.providers[0] ?? null;
  const [draftProvider, setDraftProvider] = useState<DraftProvider | null>(
    null,
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const activeProvider =
    draftProvider ?? createDefaultDraftProvider(store.providers.length);
  const existingProvider = store.providers.find(
    (provider) => provider.id === activeProvider.id,
  );
  const hasApiKey = Boolean(existingProvider?.apiKey || activeProvider.apiKey);
  const isEditing = Boolean(existingProvider);

  async function saveSettings(values: AiProviderFormValues) {
    setPending(true);
    setError("");

    try {
      const nextApiKey = values.apiKey.trim() || existingProvider?.apiKey;

      if (!nextApiKey) {
        setError(MISSING_API_KEY_MESSAGE);
        toast.error(MISSING_API_KEY_MESSAGE);
        return;
      }

      saveLocalAiProvider({
        id: activeProvider.id || createLocalAiProviderId(),
        name: values.name.trim(),
        baseUrl: values.baseUrl.trim().replace(/\/+$/, ""),
        model: values.model.trim(),
        apiKey: nextApiKey,
      });

      setDraftProvider(null);
      toast.success("Đã lưu cấu hình AI.");
    } catch {
      const message = "Cấu hình AI không hợp lệ.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  function startNewProvider() {
    setError("");
    setDraftProvider(
      createDefaultDraftProvider(store.providers.length, createLocalAiProviderId()),
    );
  }

  function selectProvider(providerId: string) {
    setError("");
    setDraftProvider(null);
    selectLocalAiProvider(providerId);
  }

  function editProvider(provider: LocalAiProvider) {
    setError("");
    setDraftProvider(toDraftProvider(provider));
  }

  function deleteProvider(provider: LocalAiProvider) {
    setError("");

    if (draftProvider?.id === provider.id) {
      setDraftProvider(null);
    }

    deleteLocalAiProvider(provider.id);
    toast.success("Đã xóa provider AI.");
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <InsightCard
          title="AI chỉ hiệu quả khi dữ liệu rõ ràng"
          description="Provider này dùng cho phân loại giao dịch, phân tích tháng và chat tài chính. Hãy chọn model ổn định, phản hồi JSON tốt và phù hợp chi phí của bạn."
        >
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2 text-[#2F6B4F]">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>
                API key được lưu trên trình duyệt này và không hiển thị lại.
              </span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <Bot className="mt-0.5 size-4 shrink-0" />
              <span>
                MoneyMind sẽ hỏi AI bằng dữ liệu giao dịch của tài khoản hiện
                tại.
              </span>
            </div>
          </div>
        </InsightCard>

        <SectionCard>
          <AiProviderFormSection
            key={activeProvider.id || `new-${store.providers.length}`}
            activeProvider={activeProvider}
            hasApiKey={hasApiKey}
            isEditing={isEditing}
            pending={pending}
            error={error}
            onNewProvider={startNewProvider}
            onSubmit={saveSettings}
          />
        </SectionCard>
      </div>

      <SectionCard>
        <section>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-semibold">Danh sách provider</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Chọn provider đang dùng hoặc sửa cấu hình từng provider.
              </p>
            </div>
            {selectedProvider ? (
              <Badge
                variant="outline"
                className="h-auto w-fit rounded-full border-[#D8E1D7] bg-[#ECF3ED] px-3 py-1 text-xs font-medium text-[#2F6B4F]"
              >
                <CheckCircle2 className="size-3.5" />
                Đang dùng: {selectedProvider.name}
              </Badge>
            ) : null}
          </div>

          {store.providers.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[#DCD7CC] bg-[#F8F5EE] px-4 py-5 text-sm text-muted-foreground">
              Chưa có provider. Hãy lưu provider đầu tiên ở form phía trên.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {store.providers.map((provider) => {
                const isSelected = provider.id === store.selectedProviderId;

                return (
                  <Card
                    key={provider.id}
                    className="gap-0 rounded-lg border-[#E4DED3] bg-[#FFFDF7]/88 py-0 shadow-[0_10px_30px_rgba(47,42,31,0.045)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_42px_rgba(47,42,31,0.065)]"
                  >
                    <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-sm font-semibold">
                            {provider.name}
                          </h4>
                          {isSelected ? (
                            <Badge className="h-auto rounded-full bg-[#ECF3ED] px-2.5 py-1 text-xs font-medium text-[#2F6B4F] hover:bg-[#ECF3ED]">
                              <CheckCircle2 className="size-3.5" />
                              Đang chọn
                            </Badge>
                          ) : null}
                        </div>
                        <div className="grid gap-1 text-sm text-muted-foreground">
                          <span className="truncate">
                            Base URL: {provider.baseUrl}
                          </span>
                          <span className="truncate">
                            Model: {provider.model}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={isSelected ? "secondary" : "outline"}
                          onClick={() => selectProvider(provider.id)}
                          disabled={isSelected}
                          aria-label={`Chọn ${provider.name}`}
                          className="h-9 border-[#DDD8CE]"
                        >
                          <CheckCircle2 className="size-4" />
                          Chọn
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => editProvider(provider)}
                          aria-label={`Sửa ${provider.name}`}
                          className="h-9 border-[#DDD8CE]"
                        >
                          <Pencil className="size-4" />
                          Sửa
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              aria-label={`Xóa ${provider.name}`}
                              className="h-9 border-[#DDD8CE] text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                              Xóa
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Xóa provider AI?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Provider &quot;{provider.name}&quot; và API key sẽ bị
                                xóa vĩnh viễn khỏi trình duyệt này. Hành động
                                này không thể khôi phục.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                aria-label={`Hủy xóa ${provider.name}`}
                              >
                                Hủy
                              </AlertDialogCancel>
                              <AlertDialogAction
                                aria-label={`Xác nhận xóa ${provider.name}`}
                                onClick={() => deleteProvider(provider)}
                              >
                                Xóa provider
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </SectionCard>
    </div>
  );
}

function AiProviderFormSection({
  activeProvider,
  hasApiKey,
  isEditing,
  pending,
  error,
  onNewProvider,
  onSubmit,
}: {
  activeProvider: DraftProvider;
  hasApiKey: boolean;
  isEditing: boolean;
  pending: boolean;
  error: string;
  onNewProvider: () => void;
  onSubmit: (values: AiProviderFormValues) => void;
}) {
  const form = useForm<AiProviderFormValues>({
    resolver: createZodResolver(aiProviderFormSchema),
    defaultValues: {
      name: activeProvider.name,
      baseUrl: activeProvider.baseUrl,
      model: activeProvider.model,
      apiKey: activeProvider.apiKey,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold">
            {isEditing ? "Sửa provider AI" : "Thêm provider AI"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Tạo provider mới hoặc chỉnh sửa provider trong danh sách bên dưới.
            Provider được chọn sẽ dùng cho chat, phân tích tháng và phân tích
            giao dịch.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={FIELD_LABEL_CLASS_NAME}>
                  Tên provider
                </FormLabel>
                <FormControl>
                  <Input {...field} className={CONTROL_CLASS_NAME} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="apiKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={FIELD_LABEL_CLASS_NAME}>
                  <KeyRound className="size-4 text-[#2F6B4F]" />
                  API key
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className={CONTROL_CLASS_NAME}
                    placeholder={
                      hasApiKey
                        ? "Đã cấu hình, nhập key mới để thay đổi"
                        : "Nhập API key"
                    }
                    type="password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="baseUrl"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className={FIELD_LABEL_CLASS_NAME}>
                  <Server className="size-4 text-[#2F6B4F]" />
                  Base URL
                </FormLabel>
                <FormControl>
                  <Input {...field} className={CONTROL_CLASS_NAME} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className={FIELD_LABEL_CLASS_NAME}>Model</FormLabel>
                <FormControl>
                  <Input {...field} className={CONTROL_CLASS_NAME} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-[#E8E4DC] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Badge
            variant="outline"
            className="h-auto w-fit rounded-full border-[#D8E1D7] bg-[#ECF3ED] px-3 py-1 text-xs font-medium text-[#2F6B4F]"
          >
            <CheckCircle2 className="size-3.5" />
            {hasApiKey ? "API key đã cấu hình" : "Chưa có API key"}
          </Badge>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              id="newProvider"
              type="button"
              variant="outline"
              onClick={onNewProvider}
              className="h-10 border-[#DDD8CE]"
            >
              <Plus className="size-4" />
              Provider mới
            </Button>
            <Button
              id="saveProvider"
              type="submit"
              disabled={pending}
              className="h-10 bg-[#2F6B4F] hover:bg-[#285B43]"
            >
              {pending
                ? "Đang lưu..."
                : isEditing
                  ? "Cập nhật provider"
                  : "Lưu provider"}
            </Button>
          </div>
        </div>
        {error ? (
          <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    </Form>
  );
}
