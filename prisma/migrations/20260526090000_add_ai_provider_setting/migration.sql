CREATE TABLE "AiProviderSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiProviderSetting_userId_key" ON "AiProviderSetting"("userId");
CREATE INDEX "AiProviderSetting_userId_idx" ON "AiProviderSetting"("userId");

ALTER TABLE "AiProviderSetting"
ADD CONSTRAINT "AiProviderSetting_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
