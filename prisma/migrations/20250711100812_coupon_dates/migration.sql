/*
  Warnings:

  - You are about to drop the column `deleteAt` on the `Coupon` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Coupon" DROP COLUMN "deleteAt",
ADD COLUMN     "deletedAt" TIMESTAMP(3);
