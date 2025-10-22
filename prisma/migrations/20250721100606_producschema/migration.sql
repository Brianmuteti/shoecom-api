/*
  Warnings:

  - You are about to drop the column `buyingPrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `discount` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `stockStatus` on the `StoreVariantStock` table. All the data in the column will be lost.
  - You are about to drop the column `storeProductId` on the `StoreVariantStock` table. All the data in the column will be lost.
  - You are about to drop the `StoreProduct` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[sku]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ENABLED', 'DISABLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('NONE', 'ACTIVE', 'ENDED', 'UPCOMING');

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_storeId_fkey";

-- DropForeignKey
ALTER TABLE "StoreProduct" DROP CONSTRAINT "StoreProduct_productId_fkey";

-- DropForeignKey
ALTER TABLE "StoreProduct" DROP CONSTRAINT "StoreProduct_storeId_fkey";

-- DropForeignKey
ALTER TABLE "StoreVariantStock" DROP CONSTRAINT "StoreVariantStock_storeProductId_fkey";

-- DropIndex
DROP INDEX "StoreVariantStock_storeId_variantId_key";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "buyingPrice",
DROP COLUMN "discount",
DROP COLUMN "storeId",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "encourageView" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "isEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "promotionStatus" "PromotionStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "safeCheckout" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "secureCheckout" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "socialShare" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "stockQty" INTEGER,
ADD COLUMN     "stockStatus" "StockStatus",
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "StoreVariantStock" DROP COLUMN "stockStatus",
DROP COLUMN "storeProductId";

-- DropTable
DROP TABLE "StoreProduct";

-- DropEnum
DROP TYPE "SalesStatus";

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
