/*
  Warnings:

  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `salePrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `stockQty` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `stockStatus` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `tax` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `wholesalePrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `wholesaleQty` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `color` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the `Color` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Size` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StoreProductStockSize` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_CouponProducts` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[couponId,customerId,orderId]` on the table `CouponUsage` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."ConditionType" AS ENUM ('PRODUCT', 'CATEGORY', 'BRAND', 'TAG');

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

-- DropForeignKey
ALTER TABLE "public"."_CouponProducts" DROP CONSTRAINT "_CouponProducts_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_CouponProducts" DROP CONSTRAINT "_CouponProducts_B_fkey";

-- DropIndex
DROP INDEX "public"."CouponUsage_couponId_customerId_usedAt_key";

-- DropIndex
DROP INDEX "public"."Product_sku_key";

-- DropIndex
DROP INDEX "public"."ProductMedia_productId_isThumbnail_key";

-- DropIndex
DROP INDEX "public"."VariantMedia_variantId_isThumbnail_key";

-- AlterTable
ALTER TABLE "public"."CouponUsage" ADD COLUMN     "orderId" INTEGER;

-- AlterTable
ALTER TABLE "public"."Product" DROP COLUMN "price",
DROP COLUMN "salePrice",
DROP COLUMN "sku",
DROP COLUMN "stockQty",
DROP COLUMN "stockStatus",
DROP COLUMN "tax",
DROP COLUMN "type",
DROP COLUMN "wholesalePrice",
DROP COLUMN "wholesaleQty";

-- AlterTable
ALTER TABLE "public"."ProductVariant" DROP COLUMN "color",
DROP COLUMN "size",
ADD COLUMN     "salePrice" DOUBLE PRECISION,
ADD COLUMN     "wholesalePrice" DOUBLE PRECISION,
ADD COLUMN     "wholesaleQty" INTEGER;

-- DropTable
DROP TABLE "public"."Color";

-- DropTable
DROP TABLE "public"."Size";

-- DropTable
DROP TABLE "public"."StoreProductStockSize";

-- DropTable
DROP TABLE "public"."_CouponProducts";

-- CreateTable
CREATE TABLE "public"."VariantAttribute" (
    "id" SERIAL NOT NULL,
    "variantId" INTEGER NOT NULL,
    "attributeId" INTEGER NOT NULL,
    "valueId" INTEGER NOT NULL,

    CONSTRAINT "VariantAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Attribute" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttributeValue" (
    "id" SERIAL NOT NULL,
    "attributeId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderCoupon" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "couponId" INTEGER NOT NULL,

    CONSTRAINT "OrderCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CouponCondition" (
    "id" SERIAL NOT NULL,
    "couponId" INTEGER NOT NULL,
    "type" "public"."ConditionType" NOT NULL,
    "value" TEXT,

    CONSTRAINT "CouponCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VariantAttribute_variantId_attributeId_key" ON "public"."VariantAttribute"("variantId", "attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_name_key" ON "public"."Attribute"("name");

-- CreateIndex
CREATE INDEX "AttributeValue_attributeId_order_idx" ON "public"."AttributeValue"("attributeId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "OrderCoupon_orderId_couponId_key" ON "public"."OrderCoupon"("orderId", "couponId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponUsage_couponId_customerId_orderId_key" ON "public"."CouponUsage"("couponId", "customerId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "public"."Product"("name");

-- CreateIndex
CREATE INDEX "ProductMedia_productId_idx" ON "public"."ProductMedia"("productId");

-- CreateIndex
CREATE INDEX "VariantMedia_variantId_idx" ON "public"."VariantMedia"("variantId");

-- AddForeignKey
ALTER TABLE "public"."VariantAttribute" ADD CONSTRAINT "VariantAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "public"."Attribute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VariantAttribute" ADD CONSTRAINT "VariantAttribute_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "public"."AttributeValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VariantAttribute" ADD CONSTRAINT "VariantAttribute_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttributeValue" ADD CONSTRAINT "AttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "public"."Attribute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderCoupon" ADD CONSTRAINT "OrderCoupon_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "public"."Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderCoupon" ADD CONSTRAINT "OrderCoupon_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouponUsage" ADD CONSTRAINT "CouponUsage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouponCondition" ADD CONSTRAINT "CouponCondition_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "public"."Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
