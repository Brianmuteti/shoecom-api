/*
  Warnings:

  - A unique constraint covering the columns `[storeId,variantId]` on the table `StoreVariantStock` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "StoreVariantStock" ADD COLUMN     "stockStatus" "StockStatus" NOT NULL DEFAULT 'IN_STOCK';

-- CreateTable
CREATE TABLE "StoreProductStock" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "stockStatus" "StockStatus" NOT NULL DEFAULT 'IN_STOCK',

    CONSTRAINT "StoreProductStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreProductStock_storeId_productId_key" ON "StoreProductStock"("storeId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreVariantStock_storeId_variantId_key" ON "StoreVariantStock"("storeId", "variantId");

-- AddForeignKey
ALTER TABLE "StoreProductStock" ADD CONSTRAINT "StoreProductStock_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreProductStock" ADD CONSTRAINT "StoreProductStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
