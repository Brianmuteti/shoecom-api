/*
  Warnings:

  - Added the required column `description` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metaDescription` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metaTitle` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ProductMedia` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "metaDescription" TEXT NOT NULL,
ADD COLUMN     "metaImage" TEXT,
ADD COLUMN     "metaTitle" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ProductMedia" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "StoreProduct" ALTER COLUMN "quantity" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "size" TEXT,
    "sku" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantMedia" (
    "id" SERIAL NOT NULL,
    "productVariantId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "hasWatermark" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VariantMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreVariantStock" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "variantId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "stockStatus" "StockStatus" NOT NULL DEFAULT 'IN_STOCK',
    "storeProductId" INTEGER,

    CONSTRAINT "StoreVariantStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "StoreVariantStock_storeId_variantId_key" ON "StoreVariantStock"("storeId", "variantId");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantMedia" ADD CONSTRAINT "VariantMedia_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreVariantStock" ADD CONSTRAINT "StoreVariantStock_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreVariantStock" ADD CONSTRAINT "StoreVariantStock_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreVariantStock" ADD CONSTRAINT "StoreVariantStock_storeProductId_fkey" FOREIGN KEY ("storeProductId") REFERENCES "StoreProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
