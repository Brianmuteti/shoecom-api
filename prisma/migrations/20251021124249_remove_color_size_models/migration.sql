/*
  Warnings:

  - You are about to drop the column `color` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the `Color` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Size` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StoreProductStockSize` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ProductVariant" DROP CONSTRAINT "ProductVariant_color_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductVariant" DROP CONSTRAINT "ProductVariant_size_fkey";

-- DropForeignKey
ALTER TABLE "public"."StoreProductStockSize" DROP CONSTRAINT "StoreProductStockSize_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."StoreProductStockSize" DROP CONSTRAINT "StoreProductStockSize_sizeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."StoreProductStockSize" DROP CONSTRAINT "StoreProductStockSize_storeId_fkey";

-- AlterTable
ALTER TABLE "public"."ProductVariant" DROP COLUMN "color",
DROP COLUMN "size";

-- DropTable
DROP TABLE "public"."Color";

-- DropTable
DROP TABLE "public"."Size";

-- DropTable
DROP TABLE "public"."StoreProductStockSize";
