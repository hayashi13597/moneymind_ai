"use client";

import { z } from "zod";

import {
  aiProviderSettingSchema,
  type AiProviderSettingInput,
} from "@/features/ai/schemas";

export const AI_PROVIDER_SETTING_STORAGE_KEY = "moneymind.aiProviderSetting";
export const AI_PROVIDER_SETTING_CHANGED_EVENT = "moneymind-ai-provider-setting";
export const LEGACY_AI_PROVIDER_ID = "legacy-provider";

export const DEFAULT_AI_PROVIDER_SETTING = {
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4.1-mini",
};

const localAiProviderSchema = aiProviderSettingSchema.extend({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

const persistedLocalAiProviderSchema = localAiProviderSchema.omit({
  apiKey: true,
});

const localAiProviderStoreSchema = z.object({
  selectedProviderId: z.string().trim().min(1),
  providers: z.array(localAiProviderSchema),
});

const persistedLocalAiProviderStoreSchema = z.object({
  selectedProviderId: z.string().trim().min(1),
  providers: z.array(persistedLocalAiProviderSchema),
});

export type LocalAiProvider = z.infer<typeof localAiProviderSchema>;
export type LocalAiProviderStore = z.infer<typeof localAiProviderStoreSchema>;

export const EMPTY_AI_PROVIDER_STORE = {
  selectedProviderId: "",
  providers: [],
} satisfies LocalAiProviderStore;

let cachedRawProviderStoreValue: string | null | undefined;
let cachedProviderStore: LocalAiProviderStore = EMPTY_AI_PROVIDER_STORE;
const apiKeyByProviderId = new Map<string, string>();

export function subscribeLocalAiProviderStore(callback: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === AI_PROVIDER_SETTING_STORAGE_KEY) {
      callback();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(AI_PROVIDER_SETTING_CHANGED_EVENT, callback);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(AI_PROVIDER_SETTING_CHANGED_EVENT, callback);
  };
}

function persistStore(store: LocalAiProviderStore) {
  const selectedProvider =
    store.providers.find(
      (provider) => provider.id === store.selectedProviderId,
    ) ?? store.providers[0];
  const normalizedStore = {
    selectedProviderId: selectedProvider?.id ?? "",
    providers: store.providers,
  };
  const persistedStore = {
    selectedProviderId: normalizedStore.selectedProviderId,
    providers: normalizedStore.providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      baseUrl: provider.baseUrl,
      model: provider.model,
    })),
  };

  window.localStorage.setItem(
    AI_PROVIDER_SETTING_STORAGE_KEY,
    JSON.stringify(persistedStore),
  );
  window.dispatchEvent(new Event(AI_PROVIDER_SETTING_CHANGED_EVENT));

  return normalizedStore;
}

export function readLocalAiProviderStore(): LocalAiProviderStore {
  const rawValue = window.localStorage.getItem(AI_PROVIDER_SETTING_STORAGE_KEY);

  if (rawValue && rawValue === cachedRawProviderStoreValue) {
    return cachedProviderStore;
  }

  cachedRawProviderStoreValue = rawValue;

  if (!rawValue) {
    apiKeyByProviderId.clear();
    cachedProviderStore = EMPTY_AI_PROVIDER_STORE;
    return cachedProviderStore;
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawValue) as unknown;
  } catch {
    cachedProviderStore = EMPTY_AI_PROVIDER_STORE;
    return cachedProviderStore;
  }

  const storeWithApiKeys = localAiProviderStoreSchema.safeParse(parsedJson);

  if (storeWithApiKeys.success) {
    const selectedProvider =
      storeWithApiKeys.data.providers.find(
        (provider) => provider.id === storeWithApiKeys.data.selectedProviderId,
      ) ?? storeWithApiKeys.data.providers[0];

    cachedProviderStore = {
      selectedProviderId: selectedProvider?.id ?? "",
      providers: storeWithApiKeys.data.providers,
    };

    return cachedProviderStore;
  }

  const persistedStore = persistedLocalAiProviderStoreSchema.safeParse(parsedJson);

  if (persistedStore.success) {
    const providers = persistedStore.data.providers.map((provider) => ({
      ...provider,
      apiKey: apiKeyByProviderId.get(provider.id) ?? "",
    }));
    const selectedProvider =
      providers.find(
        (provider) => provider.id === persistedStore.data.selectedProviderId,
      ) ?? providers[0];

    cachedProviderStore = {
      selectedProviderId: selectedProvider?.id ?? "",
      providers,
    };

    return cachedProviderStore;
  }

  const legacySetting = aiProviderSettingSchema.safeParse(parsedJson);

  if (!legacySetting.success) {
    cachedProviderStore = EMPTY_AI_PROVIDER_STORE;
    return cachedProviderStore;
  }

  cachedProviderStore = {
    selectedProviderId: LEGACY_AI_PROVIDER_ID,
    providers: [
      {
        id: LEGACY_AI_PROVIDER_ID,
        name: "Provider chính",
        ...legacySetting.data,
      },
    ],
  };

  return cachedProviderStore;
}

export function readLocalAiProviderSetting(): AiProviderSettingInput | null {
  const store = readLocalAiProviderStore();
  const selectedProvider =
    store.providers.find(
      (provider) => provider.id === store.selectedProviderId,
    ) ?? store.providers[0];

  if (!selectedProvider) {
    return null;
  }

  if (!selectedProvider.apiKey) {
    return null;
  }

  return {
    baseUrl: selectedProvider.baseUrl,
    model: selectedProvider.model,
    apiKey: selectedProvider.apiKey,
  };
}

export function saveLocalAiProviderSetting(setting: AiProviderSettingInput) {
  const store = readLocalAiProviderStore();
  const selectedProvider =
    store.providers.find(
      (provider) => provider.id === store.selectedProviderId,
    ) ?? store.providers[0];
  const provider = {
    id: selectedProvider?.id ?? LEGACY_AI_PROVIDER_ID,
    name: selectedProvider?.name ?? "Provider chính",
    ...setting,
  };

  saveLocalAiProvider(provider);

  return aiProviderSettingSchema.parse(setting);
}

export function saveLocalAiProvider(provider: LocalAiProvider) {
  const parsed = localAiProviderSchema.parse(provider);
  const store = readLocalAiProviderStore();
  apiKeyByProviderId.set(parsed.id, parsed.apiKey);
  const existingIndex = store.providers.findIndex(
    (item) => item.id === parsed.id,
  );
  const providers =
    existingIndex >= 0
      ? store.providers.map((item) => (item.id === parsed.id ? parsed : item))
      : [...store.providers, parsed];

  persistStore({
    selectedProviderId: parsed.id,
    providers,
  });

  return parsed;
}

export function selectLocalAiProvider(providerId: string) {
  const store = readLocalAiProviderStore();
  const provider = store.providers.find((item) => item.id === providerId);

  if (!provider) {
    return store;
  }

  return persistStore({
    ...store,
    selectedProviderId: provider.id,
  });
}

export function deleteLocalAiProvider(providerId: string) {
  const store = readLocalAiProviderStore();
  apiKeyByProviderId.delete(providerId);
  const providers = store.providers.filter((item) => item.id !== providerId);
  const selectedProviderId =
    store.selectedProviderId === providerId
      ? providers[0]?.id ?? ""
      : store.selectedProviderId;

  return persistStore({
    selectedProviderId,
    providers,
  });
}

export function createLocalAiProviderId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `provider-${Date.now()}`;
}
