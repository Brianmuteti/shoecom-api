-- AlterTable: Add OAuth fields to Customer table
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "providerType" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "avatar" TEXT;

-- CreateIndex: Add indexes for OAuth fields
CREATE INDEX IF NOT EXISTS "Customer_providerId_idx" ON "Customer"("providerId");
CREATE INDEX IF NOT EXISTS "Customer_providerType_idx" ON "Customer"("providerType");

-- Update existing customers to have email as providerType if they have a password
UPDATE "Customer" SET "providerType" = 'email' WHERE "password" IS NOT NULL AND "providerType" IS NULL;

