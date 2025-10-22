/*
  Warnings:

  - The `color` column on the `ProductVariant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `size` column on the `ProductVariant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `StoreProductStock` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "StoreProductStock" DROP CONSTRAINT "StoreProductStock_productId_fkey";

-- DropForeignKey
ALTER TABLE "StoreProductStock" DROP CONSTRAINT "StoreProductStock_storeId_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isTrending" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "color",
ADD COLUMN     "color" INTEGER,
DROP COLUMN "size",
ADD COLUMN     "size" INTEGER;

-- DropTable
DROP TABLE "StoreProductStock";

-- CreateTable
CREATE TABLE "Size" (
    "id" SERIAL NOT NULL,
    "ukSize" TEXT NOT NULL,
    "usSize" TEXT NOT NULL,
    "euSize" TEXT NOT NULL,

    CONSTRAINT "Size_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Color" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreProductStockSize" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "sizeId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "stockStatus" "StockStatus" NOT NULL DEFAULT 'IN_STOCK',

    CONSTRAINT "StoreProductStockSize_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Size_ukSize_key" ON "Size"("ukSize");

-- CreateIndex
CREATE UNIQUE INDEX "Size_usSize_key" ON "Size"("usSize");

-- CreateIndex
CREATE UNIQUE INDEX "Size_euSize_key" ON "Size"("euSize");

-- CreateIndex
CREATE UNIQUE INDEX "Color_name_key" ON "Color"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StoreProductStockSize_storeId_productId_sizeId_key" ON "StoreProductStockSize"("storeId", "productId", "sizeId");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_color_fkey" FOREIGN KEY ("color") REFERENCES "Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_size_fkey" FOREIGN KEY ("size") REFERENCES "Size"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreProductStockSize" ADD CONSTRAINT "StoreProductStockSize_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreProductStockSize" ADD CONSTRAINT "StoreProductStockSize_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreProductStockSize" ADD CONSTRAINT "StoreProductStockSize_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
