/*
  Warnings:

  - You are about to drop the `Attribute` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AttributeValue` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VariantAttribute` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."AttributeValue" DROP CONSTRAINT "AttributeValue_attributeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VariantAttribute" DROP CONSTRAINT "VariantAttribute_attributeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VariantAttribute" DROP CONSTRAINT "VariantAttribute_valueId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VariantAttribute" DROP CONSTRAINT "VariantAttribute_variantId_fkey";

-- AlterTable
ALTER TABLE "public"."ProductVariant" ADD COLUMN     "color" INTEGER,
ADD COLUMN     "size" INTEGER;

-- DropTable
DROP TABLE "public"."Attribute";

-- DropTable
DROP TABLE "public"."AttributeValue";

-- DropTable
DROP TABLE "public"."VariantAttribute";

-- CreateTable
CREATE TABLE "public"."Color" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Size" (
    "id" SERIAL NOT NULL,
    "ukSize" TEXT NOT NULL,
    "usSize" TEXT NOT NULL,
    "euSize" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Size_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StoreProductStockSize" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "sizeId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "stockStatus" "public"."StockStatus" NOT NULL DEFAULT 'IN_STOCK',

    CONSTRAINT "StoreProductStockSize_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Color_name_key" ON "public"."Color"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Size_ukSize_key" ON "public"."Size"("ukSize");

-- CreateIndex
CREATE UNIQUE INDEX "Size_usSize_key" ON "public"."Size"("usSize");

-- CreateIndex
CREATE UNIQUE INDEX "Size_euSize_key" ON "public"."Size"("euSize");

-- CreateIndex
CREATE UNIQUE INDEX "StoreProductStockSize_storeId_productId_sizeId_key" ON "public"."StoreProductStockSize"("storeId", "productId", "sizeId");

-- AddForeignKey
ALTER TABLE "public"."ProductVariant" ADD CONSTRAINT "ProductVariant_color_fkey" FOREIGN KEY ("color") REFERENCES "public"."Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductVariant" ADD CONSTRAINT "ProductVariant_size_fkey" FOREIGN KEY ("size") REFERENCES "public"."Size"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StoreProductStockSize" ADD CONSTRAINT "StoreProductStockSize_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StoreProductStockSize" ADD CONSTRAINT "StoreProductStockSize_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "public"."Size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StoreProductStockSize" ADD CONSTRAINT "StoreProductStockSize_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
