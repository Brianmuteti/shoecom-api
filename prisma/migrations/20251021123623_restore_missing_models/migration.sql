/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `Color` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Size` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Color" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "public"."Size" DROP COLUMN "deletedAt";

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
CREATE TABLE "public"."VariantAttribute" (
    "id" SERIAL NOT NULL,
    "variantId" INTEGER NOT NULL,
    "attributeId" INTEGER NOT NULL,
    "valueId" INTEGER NOT NULL,

    CONSTRAINT "VariantAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_name_key" ON "public"."Attribute"("name");

-- CreateIndex
CREATE INDEX "AttributeValue_attributeId_order_idx" ON "public"."AttributeValue"("attributeId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "VariantAttribute_variantId_attributeId_key" ON "public"."VariantAttribute"("variantId", "attributeId");

-- AddForeignKey
ALTER TABLE "public"."AttributeValue" ADD CONSTRAINT "AttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "public"."Attribute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VariantAttribute" ADD CONSTRAINT "VariantAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "public"."Attribute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VariantAttribute" ADD CONSTRAINT "VariantAttribute_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "public"."AttributeValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VariantAttribute" ADD CONSTRAINT "VariantAttribute_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
