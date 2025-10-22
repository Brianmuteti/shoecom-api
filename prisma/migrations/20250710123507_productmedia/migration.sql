/*
  Warnings:

  - You are about to drop the column `productVariantId` on the `VariantMedia` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productId,isThumbnail]` on the table `ProductMedia` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[variantId,isThumbnail]` on the table `VariantMedia` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `variantId` to the `VariantMedia` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "VariantMedia" DROP CONSTRAINT "VariantMedia_productVariantId_fkey";

-- AlterTable
ALTER TABLE "ProductMedia" ADD COLUMN     "isThumbnail" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "VariantMedia" DROP COLUMN "productVariantId",
ADD COLUMN     "isThumbnail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "variantId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProductMedia_productId_isThumbnail_key" ON "ProductMedia"("productId", "isThumbnail");

-- CreateIndex
CREATE UNIQUE INDEX "VariantMedia_variantId_isThumbnail_key" ON "VariantMedia"("variantId", "isThumbnail");

-- AddForeignKey
ALTER TABLE "VariantMedia" ADD CONSTRAINT "VariantMedia_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
