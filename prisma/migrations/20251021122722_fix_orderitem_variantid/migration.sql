/*
  Warnings:

  - You are about to drop the column `productId` on the `OrderItem` table. All the data in the column will be lost.
  - Added the required column `variantId` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";

-- AlterTable
ALTER TABLE "public"."OrderItem" DROP COLUMN "productId",
ADD COLUMN     "variantId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
