-- AlterTable
ALTER TABLE "Verification" ADD COLUMN     "apiKeyId" TEXT;

-- CreateIndex
CREATE INDEX "Verification_apiKeyId_createdAt_idx" ON "Verification"("apiKeyId", "createdAt");

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
